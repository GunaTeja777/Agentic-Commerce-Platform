from typing import Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, Field


class PaymentCreateRequest(BaseModel):
    """
    Payment order creation request.
    CRITICAL: Does NOT accept amount from the client.
    Amount is strictly calculated server-side from PostgreSQL order data.
    """
    order_id: int = Field(..., description="ID of the internal order to create payment for")
    request_id: Optional[str] = Field(default=None, description="Traceable correlation / request identifier")


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
    request_id: Optional[str] = None

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
    request_id: Optional[str] = None


class PaymentVerifyResponse(BaseModel):
    success: bool
    status: str
    transaction_id: int
    order_id: int
    amount_inr: float
    razorpay_payment_id: str
    message: str
    request_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PaymentFailureRequest(BaseModel):
    order_id: int
    reason: Optional[str] = "Payment cancelled or failed by user"
    error_code: Optional[str] = None
    error_description: Optional[str] = None
    request_id: Optional[str] = None


class PaymentFailureResponse(BaseModel):
    success: bool
    status: str
    order_id: int
    reason: str
    error_code: Optional[str] = None
    request_id: Optional[str] = None
