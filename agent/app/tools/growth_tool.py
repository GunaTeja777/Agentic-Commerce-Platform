import json
import logging
from typing import Dict, Any
from langchain_core.tools import tool

from app.services.backend_client import backend_client
from app.schemas.agent_schemas import GrowthRecommendationResponse

logger = logging.getLogger("agent.tools.growth")


async def execute_growth_recommendation(product_id: int) -> Dict[str, Any]:
    """
    Fetch data-driven cross-sell and upsell recommendations for a product via FastAPI backend.
    """
    try:
        response: GrowthRecommendationResponse = await backend_client.get_growth_recommendations(product_id)
        return {
            "success": True,
            "base_product": response.base_product.model_dump(),
            "recommendations": [r.model_dump() for r in response.recommendations]
        }
    except Exception as e:
        logger.error(f"Growth recommendation error: {e}")
        return {
            "success": False,
            "error": str(e),
            "base_product": {"id": product_id, "name": "", "price_inr": 0.0},
            "recommendations": []
        }


@tool
async def growth_recommendation(product_id: int) -> str:
    """
    Find data-backed upsell and cross-sell opportunities for a given base product.
    Do NOT invent recommendations or compatibility reasons.
    Input argument:
    - product_id: The integer ID of the selected base product (e.g. 1001)
    
    Returns structured JSON with base product and data-verified compatible or frequently bought together accessories.
    """
    result = await execute_growth_recommendation(product_id)
    return json.dumps(result)
