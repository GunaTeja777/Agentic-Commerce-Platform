from typing import Optional, List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.product import Product
from app.models.product_relationship import ProductRelationship
from app.services.audit_service import AuditService

class GrowthService:
    @staticmethod
    async def get_growth_recommendations(
        db: AsyncSession,
        product_id: int
    ) -> Optional[Dict[str, Any]]:
        # 1. Fetch base product
        base_product_query = select(Product).where(Product.product_id == product_id)
        base_res = await db.execute(base_product_query)
        base_product = base_res.scalars().first()

        if not base_product:
            return None

        # 2. Fetch relational recommendations from product_relationships
        query = (
            select(ProductRelationship, Product)
            .join(Product, ProductRelationship.target_product_id == Product.product_id)
            .where(
                ProductRelationship.source_product_id == product_id,
                Product.is_active == True
            )
        )
        res = await db.execute(query)
        rows = res.all()

        recommendations = []
        for rel, target in rows:
            if float(target.price_inr) > float(base_product.price_inr) * 2:
                if rel.relationship_type == "compatible":
                    reason = f"Since you're buying {base_product.product_name}, {target.product_name} is the matching compatible device."
                else:
                    reason = f"Since you're buying {base_product.product_name}, {target.product_name} is designed to pair with it."
            else:
                if rel.relationship_type == "frequently_bought_with":
                    reason = f"Since you're buying {base_product.product_name}, this {target.product_name} would be a useful addition."
                elif rel.relationship_type == "compatible":
                    reason = f"Since you're buying {base_product.product_name}, this {target.product_name} would be a useful addition."
                else:
                    reason = f"Since you're buying {base_product.product_name}, this {target.product_name} would be a useful addition."

            recommendations.append({
                "product_id": target.product_id,
                "product_name": target.product_name,
                "price_inr": float(target.price_inr),
                "stock_quantity": target.stock_quantity,
                "relationship_type": rel.relationship_type,
                "reason": reason
            })

        # 3. Log audit event
        await AuditService.log_action(
            db=db,
            merchant_id=base_product.merchant_id,
            actor_type="agent",
            action="growth_recommendation_created",
            entity_type="product",
            entity_id=product_id,
            reason=f"Generated {len(recommendations)} data-driven growth recommendations",
            status="success",
            metadata_json={
                "base_product_id": product_id,
                "recommendations_count": len(recommendations)
            }
        )

        return {
            "base_product": {
                "id": base_product.product_id,
                "name": base_product.product_name,
                "price_inr": float(base_product.price_inr)
            },
            "recommendations": [
                {
                    "id": r["product_id"],
                    "name": r["product_name"],
                    "price_inr": r["price_inr"],
                    "stock": r["stock_quantity"],
                    "type": r["relationship_type"],
                    "reason": r["reason"]
                }
                for r in recommendations
            ]
        }
