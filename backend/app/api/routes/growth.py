from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.growth_service import GrowthService
from app.schemas.recommendation import GrowthRecommendationResponse

router = APIRouter(prefix="/growth", tags=["Growth"])

@router.get(
    "/recommendations/{product_id}",
    response_model=GrowthRecommendationResponse,
    summary="Get Data-Driven Growth Recommendations (LangGraph Tool Endpoint)"
)
async def get_growth_recommendations(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await GrowthService.get_growth_recommendations(db, product_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found")
    return result
