from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class RelatedProductSummary(BaseModel):
    product_id: int
    product_name: str
    price_inr: float
    stock_quantity: int
    relationship_type: str

    model_config = ConfigDict(from_attributes=True)

class ProductResponse(BaseModel):
    product_id: int
    merchant_id: int
    product_name: str
    category: str
    subcategory: Optional[str] = None
    description: Optional[str] = None
    price_inr: float
    stock_quantity: int
    rating: Optional[float] = None
    is_active: bool
    tags: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ProductDetailResponse(ProductResponse):
    compatible_products: List[RelatedProductSummary] = []
    frequently_bought_together: List[RelatedProductSummary] = []

class ProductListResponse(BaseModel):
    total: int
    items: List[ProductResponse]
    limit: int
    offset: int
