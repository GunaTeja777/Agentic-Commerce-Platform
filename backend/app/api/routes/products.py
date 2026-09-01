from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.catalog_service import CatalogService
from app.schemas.product import (
    ProductListResponse,
    ProductDetailResponse,
    ProductResponse,
    RelatedProductSummary,
)
from app.schemas.recommendation import ProductRecommendationsResponse, RecommendationItem

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=ProductListResponse, summary="List and Search Products")
async def get_products(
    merchant_id: Optional[int] = Query(None, description="Filter by Merchant ID"),
    category: Optional[str] = Query(None, description="Filter by Category"),
    search: Optional[str] = Query(None, description="Search term for name, description, tags"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price in INR"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price in INR"),
    in_stock: Optional[bool] = Query(None, description="Filter in-stock products"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    products, total = await CatalogService.list_products(
        db=db,
        merchant_id=merchant_id,
        category=category,
        search=search,
        min_price=min_price,
        max_price=max_price,
        in_stock=in_stock,
        limit=limit,
        offset=offset
    )

    items = [ProductResponse.model_validate(p) for p in products]
    return ProductListResponse(
        total=total,
        items=items,
        limit=limit,
        offset=offset
    )

@router.get("/{product_id}", response_model=ProductDetailResponse, summary="Get Product Details with Relationships")
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await CatalogService.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found")

    compatible, frequently_bought = await CatalogService.get_product_relationships(db, product_id)

    comp_summaries = [RelatedProductSummary(**c) for c in compatible]
    freq_summaries = [RelatedProductSummary(**f) for f in frequently_bought]

    base_resp = ProductResponse.model_validate(product)
    return ProductDetailResponse(
        **base_resp.model_dump(),
        compatible_products=comp_summaries,
        frequently_bought_together=freq_summaries
    )

@router.get("/{product_id}/recommendations", response_model=ProductRecommendationsResponse, summary="Get Product Recommendations")
async def get_product_recommendations(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await CatalogService.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found")

    compatible, frequently_bought = await CatalogService.get_product_relationships(db, product_id)

    recs = []
    for item in frequently_bought:
        recs.append(
            RecommendationItem(
                product_id=item["product_id"],
                product_name=item["product_name"],
                price_inr=item["price_inr"],
                stock_quantity=item["stock_quantity"],
                relationship_type=item["relationship_type"],
                reason=f"Frequently bought with {product.product_name}"
            )
        )

    for item in compatible:
        recs.append(
            RecommendationItem(
                product_id=item["product_id"],
                product_name=item["product_name"],
                price_inr=item["price_inr"],
                stock_quantity=item["stock_quantity"],
                relationship_type=item["relationship_type"],
                reason=f"Compatible with {product.product_name}"
            )
        )

    return ProductRecommendationsResponse(
        product_id=product_id,
        recommendations=recs
    )
