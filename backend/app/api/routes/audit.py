from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.audit_service import AuditService
from app.schemas.audit import AuditLogListResponse, AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("", response_model=AuditLogListResponse, summary="List & Filter Audit Logs")
async def list_audit_logs(
    merchant_id: Optional[int] = Query(None, description="Filter by Merchant ID"),
    action: Optional[str] = Query(None, description="Filter by Action name"),
    status: Optional[str] = Query(None, description="Filter by Status (allowed, blocked, success, failed)"),
    entity_type: Optional[str] = Query(None, description="Filter by Entity type (order, product, policy)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    logs, total = await AuditService.list_audit_logs(
        db=db,
        merchant_id=merchant_id,
        action=action,
        status=status,
        entity_type=entity_type,
        limit=limit,
        offset=offset
    )

    items = [AuditLogResponse.model_validate(log) for log in logs]
    return AuditLogListResponse(
        total=total,
        items=items,
        limit=limit,
        offset=offset
    )
