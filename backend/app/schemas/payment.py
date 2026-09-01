from typing import Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, Field


class PaymentCreateRequest(BaseModel):
    """
    Payment order creation request.
    CRITICAL: Does NOT accept amount from the client.
    Amount is strictly calculated server-side from PostgreSQL order data.
    """
    order_id: int = Field(..., description="ID of the internal order to create payment for")


class PaymentCreateResponse(BaseModel):
    success: bool
    order_id: int
    razorpay_order_id: str
    amount: int  # in paise (e.g. 6650000)
    amount_inr: float  # in INR (e.g. 66500.00)
    currency: str = "INR"
    key_id: str
    status: str
    receipt: str

    model_config = ConfigDict(from_attributes=True)


class PaymentVerifyRequest(BaseModel):
    """
    Payment signature verification request.
    Payload returned by Razorpay Checkout to frontend.
    """
    order_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentVerifyResponse(BaseModel):
    success: bool
    status: str
    transaction_id: int
    order_id: int
    amount_inr: float
    razorpay_payment_id: str
    message: str

    model_config = ConfigDict(from_attributes=True)


class PaymentFailureRequest(BaseModel):
    order_id: int
    reason: Optional[str] = "Payment cancelled or failed by user"
    error_code: Optional[str] = None
    error_description: Optional[str] = None


class PaymentFailureResponse(BaseModel):
    success: bool
    status: str
    order_id: int
    reason: str
