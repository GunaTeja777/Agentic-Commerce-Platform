from typing import Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.policy import Policy
from app.services.audit_service import AuditService

class PolicyService:
    @staticmethod
    async def check_policy(
        db: AsyncSession,
        merchant_id: int,
        amount_inr: float,
        log_audit: bool = True
    ) -> Dict[str, Any]:
        """
        Deterministic Python policy verification.
        Determines whether money is allowed to move based on merchant limit.
        """
        query = select(Policy).where(
            Policy.merchant_id == merchant_id,
            Policy.is_active == True
        )
        result = await db.execute(query)
        policy = result.scalars().first()

        # Default fallback policy if not explicitly set
        max_limit = float(policy.max_transaction_inr) if policy else 70000.0

        if amount_inr > max_limit:
            allowed = False
            reason = f"Transaction exceeds maximum transaction limit of ₹{max_limit:,.2f}"
            status = "blocked"
        else:
            allowed = True
            reason = "Transaction is within the allowed limit"
            status = "allowed"

        if log_audit:
            await AuditService.log_action(
                db=db,
                merchant_id=merchant_id,
                actor_type="policy_engine",
                action="policy_checked",
                entity_type="order",
                reason=reason,
                amount_inr=amount_inr,
                status=status,
                metadata_json={
                    "max_transaction_inr": max_limit,
                    "requested_amount_inr": amount_inr,
                    "policy_id": policy.id if policy else None
                }
            )

        return {
            "allowed": allowed,
            "reason": reason,
            "max_transaction_inr": max_limit,
            "requested_amount_inr": amount_inr
        }
