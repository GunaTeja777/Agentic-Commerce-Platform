from sqlalchemy import Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class ProductRelationship(Base):
    __tablename__ = "product_relationships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    source_product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.product_id"), nullable=False, index=True)
    target_product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.product_id"), nullable=False, index=True)
    relationship_type: Mapped[str] = mapped_column(String(50), nullable=False) # 'compatible' or 'frequently_bought_with'

    __table_args__ = (
        UniqueConstraint("source_product_id", "target_product_id", "relationship_type", name="uq_product_rel"),
    )

    source_product = relationship("Product", foreign_keys=[source_product_id], back_populates="outgoing_relationships")
    target_product = relationship("Product", foreign_keys=[target_product_id], back_populates="incoming_relationships")
