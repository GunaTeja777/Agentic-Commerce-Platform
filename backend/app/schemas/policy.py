from typing import Optional
from pydantic import BaseModel, Field

class PolicyCheckRequest(BaseModel):
    merchant_id: int = Field(..., example=1)
    amount_inr: float = Field(..., gt=0, example=66500)

class PolicyCheckResponse(BaseModel):
    allowed: bool
    reason: str
    max_transaction_inr: float
    requested_amount_inr: float
