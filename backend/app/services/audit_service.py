from typing import Optional, List, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog

class AuditService:
    @staticmethod
    async def log_action(
        db: AsyncSession,
        merchant_id: int,
        actor_type: str,
        action: str,
        entity_type: str,
        entity_id: Optional[int] = None,
        reason: Optional[str] = None,
        amount_inr: Optional[float] = None,
        status: Optional[str] = None,
        metadata_json: Optional[dict] = None,
    ) -> AuditLog:
        audit_entry = AuditLog(
            merchant_id=merchant_id,
            actor_type=actor_type,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            reason=reason,
            amount_inr=amount_inr,
            status=status,
            metadata_json=metadata_json,
        )
        db.add(audit_entry)
        await db.commit()
        await db.refresh(audit_entry)
        return audit_entry

    @staticmethod
    async def list_audit_logs(
        db: AsyncSession,
        merchant_id: Optional[int] = None,
        action: Optional[str] = None,
        status: Optional[str] = None,
        entity_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[AuditLog], int]:
        query = select(AuditLog)

        if merchant_id is not None:
            query = query.where(AuditLog.merchant_id == merchant_id)
        if action:
            query = query.where(AuditLog.action == action)
        if status:
            query = query.where(AuditLog.status == status)
        if entity_type:
            query = query.where(AuditLog.entity_type == entity_type)

        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
        result = await db.execute(query)
        logs = list(result.scalars().all())

        return logs, total
