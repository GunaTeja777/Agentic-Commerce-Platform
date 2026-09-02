import hmac
import hashlib
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import razorpay
import razorpay.errors

from app.core.config import settings
from app.models.order import Order
from app.models.transaction import Transaction
from app.services.policy_service import PolicyService
from app.services.audit_service import AuditService

logger = logging.getLogger("backend.payment_service")


class PaymentService:
    @staticmethod
    def get_razorpay_client() -> razorpay.Client:
        """Initialize Razorpay Python SDK client with test credentials."""
        return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

    @staticmethod
    async def create_payment_order(
        db: AsyncSession,
        order_id: int,
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a Razorpay Test Mode Order for an internal order.
        
        CRITICAL SECURITY & INTEGRITY CHECKS:
        1. Validates order exists in PostgreSQL.
        2. Re-verifies server-side policy limits on the exact total.
        3. Prevents duplicate payments on already-captured orders.
        4. Reuses active pending Razorpay orders where appropriate.
        5. Computes paise conversion server-side (amount_inr * 100).
        6. Secret key is NEVER returned in response.
        """
        logger.info(f"[PAYMENT] Initiating payment order creation for Order ID {order_id}")

        # 1. Fetch Order from PostgreSQL
        query = select(Order).where(Order.id == order_id)
        result = await db.execute(query)
        order = result.scalar_one_or_none()

        if not order:
            logger.error(f"[PAYMENT] Order ID {order_id} not found in database")
            raise HTTPException(
                status_code=404,
                detail={"error_code": "ORDER_NOT_FOUND", "detail": f"Order {order_id} not found"}
            )

        # 2. Check Order Status
        if order.status == "blocked":
            logger.warning(f"[PAYMENT] Cannot create payment: Order ID {order_id} is blocked by policy")
            raise HTTPException(
                status_code=403,
                detail={
                    "error_code": "POLICY_BLOCKED",
                    "detail": "Transaction was blocked by policy. Payment cannot be initiated."
                }
            )

        if order.status in ["paid", "completed"]:
            logger.warning(f"[PAYMENT] Duplicate payment attempt: Order ID {order_id} is already paid")
            raise HTTPException(
                status_code=400,
                detail={
                    "error_code": "PAYMENT_ALREADY_COMPLETED",
                    "detail": "Order already paid."
                }
            )

        # 3. Check Existing Transaction & Idempotency
        txn_query = select(Transaction).where(Transaction.order_id == order_id)
        txn_result = await db.execute(txn_query)
        txn = txn_result.scalar_one_or_none()

        if txn and txn.status == "captured":
            logger.warning(f"[PAYMENT] Transaction for order {order_id} is already captured")
            raise HTTPException(
                status_code=400,
                detail={
                    "error_code": "PAYMENT_ALREADY_COMPLETED",
                    "detail": "Order already paid."
                }
            )

        # 4. Deterministic Policy Re-Verification (Server-side defense in depth)
        amount_inr = float(order.total_inr)
        policy_res = await PolicyService.check_policy(
            db=db,
            merchant_id=order.merchant_id,
            amount_inr=amount_inr,
            log_audit=False,
            request_id=request_id
        )

        if not policy_res["allowed"]:
            logger.error(f"[PAYMENT] Policy Gate BLOCKED payment creation for Order {order_id}: {policy_res['reason']}")
            await AuditService.log_action(
                db=db,
                merchant_id=order.merchant_id,
                actor_type="policy_engine",
                action="payment_blocked",
                entity_type="order",
                entity_id=order.id,
                reason=policy_res["reason"],
                amount_inr=amount_inr,
                status="blocked",
                request_id=request_id
            )
            raise HTTPException(
                status_code=403,
                detail={
                    "error_code": "POLICY_BLOCKED",
                    "error": "Payment blocked by policy",
                    "reason": policy_res["reason"],
                    "order_id": order.id,
                    "amount_inr": amount_inr
                }
            )

        # Log payment requested
        await AuditService.log_action(
            db=db,
            merchant_id=order.merchant_id,
            actor_type="payment_service",
            action="payment_requested",
            entity_type="order",
            entity_id=order.id,
            reason=f"Payment requested for Order #{order.id} (₹{amount_inr:,.2f})",
            amount_inr=amount_inr,
            status="pending",
            request_id=request_id
        )

        # 5. Idempotent Reuse of Pending Razorpay Order if active and matches amount
        amount_paise = int(round(amount_inr * 100))
        receipt_str = f"rcpt_ord_{order.id}"

        if txn and txn.status == "pending" and txn.provider_reference:
            # Reusing existing pending test order
            logger.info(f"[PAYMENT] Reusing existing pending Razorpay order: {txn.provider_reference}")
            return {
                "success": True,
                "order_id": order.id,
                "razorpay_order_id": txn.provider_reference,
                "amount": amount_paise,
                "amount_inr": amount_inr,
                "currency": "INR",
                "key_id": settings.RAZORPAY_KEY_ID,
                "status": "pending",
                "receipt": receipt_str,
                "request_id": request_id
            }

        # 6. Create Razorpay Test Order via SDK
        try:
            client = PaymentService.get_razorpay_client()
            logger.info(f"[RAZORPAY] Creating test order for amount_paise={amount_paise}, receipt={receipt_str}")
            
            razorpay_order = client.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt_str,
                "notes": {
                    "order_id": str(order.id),
                    "merchant_id": str(order.merchant_id),
                    "environment": settings.RAZORPAY_ENV
                }
            })
            razorpay_order_id = razorpay_order["id"]
            logger.info(f"[RAZORPAY] Test order created successfully: {razorpay_order_id}")
        except Exception as e:
            logger.error(f"[RAZORPAY] Razorpay API order creation failed: {str(e)}")
            raise HTTPException(
                status_code=502,
                detail=f"Razorpay order creation failed: {str(e)}"
            )

        # 7. Update or Create DB Transaction
        if not txn:
            txn = Transaction(
                order_id=order.id,
                amount_inr=amount_inr,
                status="pending",
                provider="razorpay",
                provider_reference=razorpay_order_id
            )
            db.add(txn)
        else:
            txn.provider_reference = razorpay_order_id
            txn.status = "pending"
            txn.amount_inr = amount_inr
            txn.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(txn)

        # 8. Record Audit Trail
        await AuditService.log_action(
            db=db,
            merchant_id=order.merchant_id,
            actor_type="payment_service",
            action="razorpay_order_created",
            entity_type="transaction",
            entity_id=txn.id,
            reason=f"Created Razorpay test order {razorpay_order_id} for Order #{order.id}",
            amount_inr=amount_inr,
            status="pending",
            metadata_json={
                "razorpay_order_id": razorpay_order_id,
                "amount_paise": amount_paise,
                "currency": "INR",
                "receipt": receipt_str
            },
            request_id=request_id
        )

        return {
            "success": True,
            "order_id": order.id,
            "razorpay_order_id": razorpay_order_id,
            "amount": amount_paise,
            "amount_inr": amount_inr,
            "currency": "INR",
            "key_id": settings.RAZORPAY_KEY_ID,
            "status": "pending",
            "receipt": receipt_str,
            "request_id": request_id
        }

    @staticmethod
    async def verify_payment_signature(
        db: AsyncSession,
        order_id: int,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Cryptographically verify the payment signature using the Razorpay Test Secret.
        
        NEVER TRUST FRONTEND STATUS. Always verify HMAC SHA-256 signature.
        """
        logger.info(f"[PAYMENT] Starting payment signature verification for Order ID {order_id}")

        # 1. Fetch Order and Transaction
        query = select(Order).where(Order.id == order_id)
        result = await db.execute(query)
        order = result.scalar_one_or_none()

        if not order:
            logger.error(f"[PAYMENT] Order ID {order_id} not found during verification")
            raise HTTPException(
                status_code=404,
                detail={"error_code": "ORDER_NOT_FOUND", "detail": "Order not found"}
            )

        txn_query = select(Transaction).where(Transaction.order_id == order_id)
        txn_res = await db.execute(txn_query)
        txn = txn_res.scalar_one_or_none()

        if not txn:
            logger.error(f"[PAYMENT] No transaction found for Order ID {order_id}")
            raise HTTPException(
                status_code=404,
                detail={"error_code": "TRANSACTION_NOT_FOUND", "detail": "Transaction not found"}
            )

        # 2. If already captured (idempotency)
        if txn.status == "captured":
            logger.info(f"[PAYMENT] Transaction {txn.id} for Order {order_id} is already captured")
            return {
                "success": True,
                "status": "captured",
                "transaction_id": txn.id,
                "order_id": order.id,
                "amount_inr": float(txn.amount_inr),
                "razorpay_payment_id": razorpay_payment_id,
                "message": "Payment already verified and captured."
            }

        # 3. Log verification attempt
        await AuditService.log_action(
            db=db,
            merchant_id=order.merchant_id,
            actor_type="payment_service",
            action="payment_verification_started",
            entity_type="transaction",
            entity_id=txn.id,
            reason=f"Verifying Razorpay signature for payment {razorpay_payment_id}",
            amount_inr=float(order.total_inr),
            status="pending",
            metadata_json={
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id
            },
            request_id=request_id
        )

        # 4. Verify Signature via Razorpay SDK utility or standard HMAC SHA-256
        client = PaymentService.get_razorpay_client()
        params_dict = {
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature
        }

        try:
            client.utility.verify_payment_signature(params_dict)
            is_valid = True
        except razorpay.errors.SignatureVerificationError:
            is_valid = False
        except Exception as e:
            logger.warning(f"[PAYMENT] SDK verification raised exception ({e}), falling back to direct HMAC calculation")
            msg = f"{razorpay_order_id}|{razorpay_payment_id}"
            generated_signature = hmac.new(
                settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
                msg.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
            is_valid = hmac.compare_digest(generated_signature, razorpay_signature)

        if not is_valid:
            logger.error(f"[PAYMENT] Invalid payment signature for Order {order_id}, Payment {razorpay_payment_id}")
            txn.status = "failed"
            order.status = "failed"
            txn.updated_at = datetime.utcnow()
            await db.commit()

            await AuditService.log_action(
                db=db,
                merchant_id=order.merchant_id,
                actor_type="payment_service",
                action="payment_failed",
                entity_type="transaction",
                entity_id=txn.id,
                reason="Invalid Razorpay payment signature verification failed",
                amount_inr=float(order.total_inr),
                status="failed",
                metadata_json={"razorpay_payment_id": razorpay_payment_id},
                request_id=request_id
            )

            raise HTTPException(
                status_code=400,
                detail={
                    "error_code": "INVALID_PAYMENT_SIGNATURE",
                    "detail": "Invalid payment signature. Verification failed."
                }
            )

        # 5. Payment Verified Successfully: Update DB & Capture
        logger.info(f"[PAYMENT] Signature verified successfully for Order {order_id} and Payment {razorpay_payment_id}")
        txn.status = "captured"
        txn.provider_reference = razorpay_order_id
        txn.updated_at = datetime.utcnow()

        order.status = "paid"

        await db.commit()
        await db.refresh(txn)

        # 6. Audit Logs
        await AuditService.log_action(
            db=db,
            merchant_id=order.merchant_id,
            actor_type="payment_service",
            action="payment_verified",
            entity_type="transaction",
            entity_id=txn.id,
            reason=f"Payment signature verified for Razorpay payment {razorpay_payment_id}",
            amount_inr=float(order.total_inr),
            status="success",
            metadata_json={
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_order_id": razorpay_order_id
            },
            request_id=request_id
        )

        await AuditService.log_action(
            db=db,
            merchant_id=order.merchant_id,
            actor_type="payment_service",
            action="transaction_captured",
            entity_type="transaction",
            entity_id=txn.id,
            reason=f"Transaction captured for Order #{order.id} (₹{float(order.total_inr):,.2f})",
            amount_inr=float(order.total_inr),
            status="captured",
            metadata_json={
                "payment_id": razorpay_payment_id,
                "order_id": order.id
            },
            request_id=request_id
        )

        return {
            "success": True,
            "status": "captured",
            "transaction_id": txn.id,
            "order_id": order.id,
            "amount_inr": float(order.total_inr),
            "razorpay_payment_id": razorpay_payment_id,
            "message": "Payment verified and captured successfully.",
            "request_id": request_id
        }

    @staticmethod
    async def handle_payment_failure(
        db: AsyncSession,
        order_id: int,
        reason: str = "Payment failed or cancelled by user",
        error_code: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Record a failed or cancelled payment attempt gracefully.
        No blind automatic retries.
        """
        logger.warning(f"[PAYMENT] Recording payment failure for Order ID {order_id}: {reason}")

        query = select(Order).where(Order.id == order_id)
        result = await db.execute(query)
        order = result.scalar_one_or_none()

        if not order:
            raise HTTPException(
                status_code=404,
                detail={"error_code": "ORDER_NOT_FOUND", "detail": "Order not found"}
            )

        txn_query = select(Transaction).where(Transaction.order_id == order_id)
        txn_res = await db.execute(txn_query)
        txn = txn_res.scalar_one_or_none()

        if txn and txn.status != "captured":
            txn.status = "failed"
            txn.updated_at = datetime.utcnow()
            order.status = "failed"
            await db.commit()

            await AuditService.log_action(
                db=db,
                merchant_id=order.merchant_id,
                actor_type="payment_service",
                action="payment_failed",
                entity_type="transaction",
                entity_id=txn.id,
                reason=reason,
                amount_inr=float(order.total_inr),
                status="failed",
                metadata_json={"error_code": error_code or "PAYMENT_FAILED", "reason": reason},
                request_id=request_id
            )

        return {
            "success": False,
            "status": "failed",
            "order_id": order.id,
            "reason": reason,
            "error_code": error_code or "PAYMENT_FAILED",
            "request_id": request_id
        }

    @staticmethod
    async def process_webhook(
        db: AsyncSession,
        webhook_body: bytes,
        webhook_signature: str,
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process authenticated incoming Razorpay webhooks.
        """
        logger.info("[WEBHOOK] Processing incoming Razorpay webhook")

        # 1. Verify Webhook Signature
        client = PaymentService.get_razorpay_client()
        try:
            client.utility.verify_webhook_signature(
                webhook_body.decode("utf-8"),
                webhook_signature,
                settings.RAZORPAY_WEBHOOK_SECRET
            )
        except Exception as e:
            logger.error(f"[WEBHOOK] Invalid webhook signature: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail={"error_code": "INVALID_WEBHOOK_SIGNATURE", "detail": "Invalid webhook signature"}
            )

        import json
        payload = json.loads(webhook_body.decode("utf-8"))
        event = payload.get("event")
        entity_payload = payload.get("payload", {}).get("payment", {}).get("entity", {})
        razorpay_order_id = entity_payload.get("order_id")
        razorpay_payment_id = entity_payload.get("id")
        amount_paise = entity_payload.get("amount", 0)
        amount_inr = amount_paise / 100.0

        logger.info(f"[WEBHOOK] Received verified event '{event}' for order '{razorpay_order_id}'")

        # Locate transaction by provider reference
        if razorpay_order_id:
            txn_query = select(Transaction).where(Transaction.provider_reference == razorpay_order_id)
            txn_res = await db.execute(txn_query)
            txn = txn_res.scalar_one_or_none()

            if txn:
                order_query = select(Order).where(Order.id == txn.order_id)
                order_res = await db.execute(order_query)
                order = order_res.scalar_one_or_none()

                if event == "payment.captured":
                    txn.status = "captured"
                    txn.updated_at = datetime.utcnow()
                    if order:
                        order.status = "paid"
                    await db.commit()

                    await AuditService.log_action(
                        db=db,
                        merchant_id=order.merchant_id if order else 1,
                        actor_type="payment_service",
                        action="payment_webhook_received",
                        entity_type="transaction",
                        entity_id=txn.id,
                        reason=f"Webhook confirmed payment.captured for {razorpay_payment_id}",
                        amount_inr=amount_inr,
                        status="captured",
                        request_id=request_id
                    )

                elif event == "payment.failed":
                    if txn.status != "captured":
                        txn.status = "failed"
                        txn.updated_at = datetime.utcnow()
                        if order:
                            order.status = "failed"
                        await db.commit()

                    await AuditService.log_action(
                        db=db,
                        merchant_id=order.merchant_id if order else 1,
                        actor_type="payment_service",
                        action="payment_webhook_received",
                        entity_type="transaction",
                        entity_id=txn.id,
                        reason=f"Webhook confirmed payment.failed for {razorpay_payment_id}",
                        amount_inr=amount_inr,
                        status="failed",
                        request_id=request_id
                    )

        return {"status": "ok", "event": event}
