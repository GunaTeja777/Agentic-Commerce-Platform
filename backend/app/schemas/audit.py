from datetime import datetime
from typing import Optional, Any, Dict, List
from pydantic import BaseModel, ConfigDict

class AuditLogResponse(BaseModel):
    id: int
    merchant_id: int
    actor_type: str
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    reason: Optional[str] = None
    amount_inr: Optional[float] = None
    status: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AuditLogListResponse(BaseModel):
    total: int
    items: List[AuditLogResponse]
    limit: int
    offset: int
