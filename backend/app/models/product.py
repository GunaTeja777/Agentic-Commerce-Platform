from typing import Optional
from sqlalchemy import Integer, String, Text, Numeric, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class Product(Base):
    __tablename__ = "products"

    product_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    merchant_id: Mapped[int] = mapped_column(Integer, ForeignKey("merchants.id"), nullable=False, index=True)
    product_name: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    subcategory: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price_inr: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    rating: Mapped[Optional[float]] = mapped_column(Numeric(2, 1), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    merchant = relationship("Merchant", back_populates="products")
    
    outgoing_relationships = relationship(
        "ProductRelationship",
        foreign_keys="[ProductRelationship.source_product_id]",
        back_populates="source_product",
        cascade="all, delete-orphan",
    )
    incoming_relationships = relationship(
        "ProductRelationship",
        foreign_keys="[ProductRelationship.target_product_id]",
        back_populates="target_product",
        cascade="all, delete-orphan",
    )
