from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.order_service import OrderService
from app.schemas.order import (
    OrderCreateRequest,
    OrderCreateResponse,
    OrderItemResponse,
    TransactionResponse,
)

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post(
    "",
    response_model=OrderCreateResponse,
    status_code=201,
    summary="Create Order & Evaluate Policy Pipeline"
)
async def create_order(
    payload: OrderCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    raw_items = [{"product_id": item.product_id, "quantity": item.quantity} for item in payload.items]
    res = await OrderService.create_order(
        db=db,
        merchant_id=payload.merchant_id,
        buyer_id=payload.buyer_id,
        items=raw_items
    )

    order = res["order"]
    order_items = res["items"]
    txn = res["transaction"]

    items_resp = [
        OrderItemResponse(
            product_id=oi.product_id,
            product_name=c_item["product"].product_name,
            quantity=oi.quantity,
            unit_price_inr=float(oi.unit_price_inr),
            total_price_inr=float(oi.total_price_inr)
        )
        for oi, c_item in zip(order_items, res["calculated_items"])
    ]

    txn_resp = TransactionResponse.model_validate(txn) if txn else None

    return OrderCreateResponse(
        order_id=order.id,
        merchant_id=order.merchant_id,
        buyer_id=order.buyer_id,
        subtotal_inr=float(order.subtotal_inr),
        total_inr=float(order.total_inr),
        status=order.status,
        created_at=order.created_at,
        policy_allowed=res["policy_allowed"],
        policy_reason=res["policy_reason"],
        items=items_resp,
        transaction=txn_resp
    )
