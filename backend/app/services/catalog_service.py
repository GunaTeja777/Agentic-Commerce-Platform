from typing import Optional, List, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.product import Product
from app.models.product_relationship import ProductRelationship

class CatalogService:
    @staticmethod
    async def list_products(
        db: AsyncSession,
        merchant_id: Optional[int] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        in_stock: Optional[bool] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Tuple[List[Product], int]:
        query = select(Product).where(Product.is_active == True)

        if merchant_id is not None:
            query = query.where(Product.merchant_id == merchant_id)
        if category:
            query = query.where(func.lower(Product.category) == category.lower())
        if search:
            search_terms = [t.strip().lower() for t in search.split() if len(t.strip()) > 1]
            if not search_terms:
                search_terms = [search.lower()]
            search_clauses = []
            for term in search_terms:
                term_pattern = f"%{term}%"
                search_clauses.extend([
                    func.lower(Product.product_name).like(term_pattern),
                    func.lower(Product.description).like(term_pattern),
                    func.lower(Product.category).like(term_pattern),
                    func.lower(Product.tags).like(term_pattern),
                ])
            query = query.where(or_(*search_clauses))
        if min_price is not None:
            query = query.where(Product.price_inr >= min_price)
        if max_price is not None:
            query = query.where(Product.price_inr <= max_price)
        if in_stock is True:
            query = query.where(Product.stock_quantity > 0)

        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        query = query.order_by(Product.product_id.asc()).offset(offset).limit(limit)
        result = await db.execute(query)
        products = list(result.scalars().all())

        return products, total

    @staticmethod
    async def get_product_by_id(db: AsyncSession, product_id: int) -> Optional[Product]:
        query = select(Product).where(Product.product_id == product_id)
        result = await db.execute(query)
        return result.scalars().first()

    @staticmethod
    async def get_product_relationships(
        db: AsyncSession,
        product_id: int
    ) -> Tuple[List[dict], List[dict]]:
        query = (
            select(ProductRelationship, Product)
            .join(Product, ProductRelationship.target_product_id == Product.product_id)
            .where(ProductRelationship.source_product_id == product_id)
        )
        result = await db.execute(query)
        rows = result.all()

        compatible = []
        frequently_bought = []

        for rel, target in rows:
            summary = {
                "product_id": target.product_id,
                "product_name": target.product_name,
                "price_inr": float(target.price_inr),
                "stock_quantity": target.stock_quantity,
                "relationship_type": rel.relationship_type,
            }
            if rel.relationship_type == "compatible":
                compatible.append(summary)
            elif rel.relationship_type == "frequently_bought_with":
                frequently_bought.append(summary)

        return compatible, frequently_bought
