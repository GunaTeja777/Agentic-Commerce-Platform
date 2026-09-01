from typing import Optional
from sqlalchemy import Integer, Numeric, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    merchant_id: Mapped[int] = mapped_column(Integer, ForeignKey("merchants.id"), nullable=False, index=True)
    max_transaction_inr: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    approval_required_above_inr: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    merchant = relationship("Merchant", back_populates="policies")
