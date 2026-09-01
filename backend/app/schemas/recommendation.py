from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class RecommendationItem(BaseModel):
    product_id: int
    product_name: str
    price_inr: float
    stock_quantity: int
    relationship_type: str
    reason: str

    model_config = ConfigDict(from_attributes=True)

class ProductRecommendationsResponse(BaseModel):
    product_id: int
    recommendations: List[RecommendationItem]

class GrowthBaseProduct(BaseModel):
    id: int
    name: str
    price_inr: float

class GrowthRecommendationItem(BaseModel):
    id: int
    name: str
    price_inr: float
    stock: int
    type: str
    reason: str

class GrowthRecommendationResponse(BaseModel):
    base_product: GrowthBaseProduct
    recommendations: List[GrowthRecommendationItem]
