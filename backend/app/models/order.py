from datetime import datetime
from typing import List, Optional
from sqlalchemy import Integer, String, Numeric, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    merchant_id: Mapped[int] = mapped_column(Integer, ForeignKey("merchants.id"), nullable=False, index=True)
    buyer_id: Mapped[str] = mapped_column(String(255), nullable=False)
    subtotal_inr: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_inr: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="created")  # 'created', 'blocked', 'failed'
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    merchant = relationship("Merchant", back_populates="orders")
    items: Mapped[List["OrderItem"]] = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    transaction = relationship("Transaction", back_populates="order", uselist=False, cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.product_id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_inr: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_price_inr: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")
