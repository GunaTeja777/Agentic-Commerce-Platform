import logging
from fastapi import APIRouter, Depends, Request, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.payment_service import PaymentService
from app.schemas.payment import (
    PaymentCreateRequest,
    PaymentCreateResponse,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
    PaymentFailureRequest,
    PaymentFailureResponse,
)

logger = logging.getLogger("backend.api.payments")

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post(
    "/create",
    response_model=PaymentCreateResponse,
    summary="Create Razorpay Test Mode Order for Verified Order"
)
async def create_payment(
    payload: PaymentCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a Razorpay Test Mode payment order for the specified internal order.
    
    IMPORTANT:
    - Amount is NOT accepted from client.
    - Server verifies order existence and calculates amount from DB.
    - Re-evaluates Policy Engine before calling Razorpay.
    """
    res = await PaymentService.create_payment_order(db=db, order_id=payload.order_id)
    return PaymentCreateResponse(**res)


@router.post(
    "/verify",
    response_model=PaymentVerifyResponse,
    summary="Cryptographically Verify Razorpay Payment Signature"
)
async def verify_payment(
    payload: PaymentVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Validates the cryptographic HMAC SHA-256 signature returned by Razorpay Checkout.
    Only marks transaction captured upon successful backend verification.
    """
    res = await PaymentService.verify_payment_signature(
        db=db,
        order_id=payload.order_id,
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        razorpay_signature=payload.razorpay_signature
    )
    return PaymentVerifyResponse(**res)


@router.post(
    "/fail",
    response_model=PaymentFailureResponse,
    summary="Record Client-Side Payment Failure or Dismissal"
)
async def fail_payment(
    payload: PaymentFailureRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Safely records a user-dismissed or failed payment transaction without retry loop.
    """
    res = await PaymentService.handle_payment_failure(
        db=db,
        order_id=payload.order_id,
        reason=payload.reason or "Payment failed or cancelled by user",
        error_code=payload.error_code
    )
    return PaymentFailureResponse(**res)


@router.post(
    "/webhook",
    summary="Handle Incoming Razorpay Webhooks"
)
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Receives and processes authenticated webhooks from Razorpay Test Mode.
    Validates X-Razorpay-Signature header against RAZORPAY_WEBHOOK_SECRET.
    """
    if not x_razorpay_signature:
        logger.warning("[WEBHOOK] Missing X-Razorpay-Signature header")
        raise HTTPException(status_code=400, detail="Missing signature header")

    body_bytes = await request.body()
    res = await PaymentService.process_webhook(
        db=db,
        webhook_body=body_bytes,
        webhook_signature=x_razorpay_signature
    )
    return res
