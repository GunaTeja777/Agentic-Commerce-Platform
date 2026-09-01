from datetime import datetime
from typing import Optional, Any
from sqlalchemy import Integer, String, Text, Numeric, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    merchant_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False) # 'ai_buyer', 'agent', 'system', 'policy_engine', 'user'
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    amount_inr: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True) # 'allowed', 'blocked', 'success', 'failed'
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
