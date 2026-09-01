from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.policy_service import PolicyService
from app.schemas.policy import PolicyCheckRequest, PolicyCheckResponse

router = APIRouter(prefix="/policies", tags=["Policies"])

@router.post(
    "/check",
    response_model=PolicyCheckResponse,
    summary="Check Merchant Policy (Deterministic Limits)"
)
async def check_policy(
    payload: PolicyCheckRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await PolicyService.check_policy(
        db=db,
        merchant_id=payload.merchant_id,
        amount_inr=payload.amount_inr,
        log_audit=True
    )
    return PolicyCheckResponse(**result)
