from typing import List, Dict, Any
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.models.transaction import Transaction
from app.services.policy_service import PolicyService
from app.services.audit_service import AuditService

class OrderService:
    @staticmethod
    async def create_order(
        db: AsyncSession,
        merchant_id: int,
        buyer_id: str,
        items: List[Dict[str, int]],
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        if not items:
            raise HTTPException(
                status_code=400,
                detail={"error_code": "EMPTY_ORDER", "detail": "Order items list cannot be empty"}
            )

        # 1. Fetch products from DB & validate strictly
        product_ids = [item["product_id"] for item in items]
        query = select(Product).where(Product.product_id.in_(product_ids))
        res = await db.execute(query)
        db_products = {p.product_id: p for p in res.scalars().all()}

        calculated_items = []
        subtotal_inr = 0.0

        for item in items:
            pid = item.get("product_id")
            qty = item.get("quantity", 1)

            if not pid or pid not in db_products:
                raise HTTPException(
                    status_code=404,
                    detail={"error_code": "PRODUCT_NOT_FOUND", "detail": f"Product ID {pid} not found in catalog"}
                )

            if qty <= 0:
                raise HTTPException(
                    status_code=400,
                    detail={"error_code": "INVALID_QUANTITY", "detail": f"Quantity must be greater than zero for product ID {pid}"}
                )

            prod = db_products[pid]

            if not prod.is_active:
                raise HTTPException(
                    status_code=400,
                    detail={"error_code": "PRODUCT_INACTIVE", "detail": f"Product '{prod.product_name}' (ID: {pid}) is inactive and cannot be purchased"}
                )

            if prod.stock_quantity < qty:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error_code": "INSUFFICIENT_STOCK",
                        "detail": f"Insufficient stock for '{prod.product_name}'. Requested: {qty}, Available: {prod.stock_quantity}"
                    }
                )

            # Server-side authoritative price from PostgreSQL
            unit_price = float(prod.price_inr)
            item_total = unit_price * qty
            subtotal_inr += item_total

            calculated_items.append({
                "product": prod,
                "product_id": pid,
                "quantity": qty,
                "unit_price_inr": unit_price,
                "total_price_inr": item_total
            })

        total_inr = subtotal_inr

        # 2. Check Policy (Deterministic backend enforcement)
        policy_res = await PolicyService.check_policy(
            db=db,
            merchant_id=merchant_id,
            amount_inr=total_inr,
            log_audit=True,
            request_id=request_id
        )

        policy_allowed = policy_res["allowed"]
        policy_reason = policy_res["reason"]

        if not policy_allowed:
            # Create blocked order record for auditability, BUT NO PAYABLE TRANSACTION
            order = Order(
                merchant_id=merchant_id,
                buyer_id=buyer_id,
                subtotal_inr=subtotal_inr,
                total_inr=total_inr,
                status="blocked"
            )
            db.add(order)
            await db.flush()

            for c_item in calculated_items:
                order_item = OrderItem(
                    order_id=order.id,
                    product_id=c_item["product_id"],
                    quantity=c_item["quantity"],
                    unit_price_inr=c_item["unit_price_inr"],
                    total_price_inr=c_item["total_price_inr"]
                )
                db.add(order_item)

            # Create blocked transaction record (status = 'blocked')
            txn = Transaction(
                order_id=order.id,
                amount_inr=total_inr,
                status="blocked",
                provider="razorpay",
                provider_reference=None
            )
            db.add(txn)
            await db.commit()

            await AuditService.log_action(
                db=db,
                merchant_id=merchant_id,
                actor_type="policy_engine",
                action="payment_blocked",
                entity_type="order",
                entity_id=order.id,
                reason=policy_reason,
                amount_inr=total_inr,
                status="blocked",
                request_id=request_id
            )

            raise HTTPException(
                status_code=403,
                detail={
                    "error_code": "POLICY_BLOCKED",
                    "error": "Transaction blocked by merchant policy",
                    "reason": policy_reason,
                    "order_id": order.id,
                    "amount_inr": total_inr,
                    "max_transaction_inr": policy_res["max_transaction_inr"]
                }
            )

        # 3. Policy Allowed: Create Order & Transaction
        order = Order(
            merchant_id=merchant_id,
            buyer_id=buyer_id,
            subtotal_inr=subtotal_inr,
            total_inr=total_inr,
            status="created"
        )
        db.add(order)
        await db.flush()

        order_items_objs = []
        for c_item in calculated_items:
            order_item = OrderItem(
                order_id=order.id,
                product_id=c_item["product_id"],
                quantity=c_item["quantity"],
                unit_price_inr=c_item["unit_price_inr"],
                total_price_inr=c_item["total_price_inr"]
            )
            db.add(order_item)
            order_items_objs.append(order_item)

            # Deduct stock safely ensuring non-negative
            c_item["product"].stock_quantity = max(0, c_item["product"].stock_quantity - c_item["quantity"])

        txn = Transaction(
            order_id=order.id,
            amount_inr=total_inr,
            status="pending",
            provider="razorpay",
            provider_reference=None
        )
        db.add(txn)
        await db.commit()

        await AuditService.log_action(
            db=db,
            merchant_id=merchant_id,
            actor_type="ai_buyer",
            action="order_created",
            entity_type="order",
            entity_id=order.id,
            reason="Order created successfully and policy verified",
            amount_inr=total_inr,
            status="allowed",
            metadata_json={"buyer_id": buyer_id, "item_count": len(calculated_items)},
            request_id=request_id
        )

        return {
            "order": order,
            "items": order_items_objs,
            "transaction": txn,
            "policy_allowed": policy_allowed,
            "policy_reason": policy_reason,
            "calculated_items": calculated_items
        }

    @staticmethod
    async def get_order(db: AsyncSession, order_id: int) -> Optional[Order]:
        from sqlalchemy.orm import selectinload
        query = (
            select(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.product), selectinload(Order.transaction))
            .where(Order.id == order_id)
        )
        res = await db.execute(query)
        return res.scalar_one_or_none()

    @staticmethod
    async def list_orders(db: AsyncSession, merchant_id: Optional[int] = None, limit: int = 50) -> List[Order]:
        from sqlalchemy.orm import selectinload
        query = (
            select(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.product), selectinload(Order.transaction))
            .order_by(Order.created_at.desc())
            .limit(limit)
        )
        if merchant_id:
            query = query.where(Order.merchant_id == merchant_id)
        res = await db.execute(query)
        return list(res.scalars().all())
