from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class OrderItemRequest(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

class OrderCreateRequest(BaseModel):
    merchant_id: int
    buyer_id: str
    items: List[OrderItemRequest]
    request_id: Optional[str] = None

class OrderItemResponse(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    unit_price_inr: float
    total_price_inr: float

    model_config = ConfigDict(from_attributes=True)

class TransactionResponse(BaseModel):
    id: int
    order_id: int
    amount_inr: float
    status: str
    provider: str
    provider_reference: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class OrderCreateResponse(BaseModel):
    order_id: int
    merchant_id: int
    buyer_id: str
    subtotal_inr: float
    total_inr: float
    status: str
    created_at: datetime
    policy_allowed: bool
    policy_reason: str
    items: List[OrderItemResponse]
    transaction: Optional[TransactionResponse] = None
    request_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
