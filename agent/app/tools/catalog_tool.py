import json
import logging
from typing import Optional, Dict, Any, List
from langchain_core.tools import tool

from app.services.backend_client import backend_client
from app.schemas.agent_schemas import ProductResult

logger = logging.getLogger("agent.tools.catalog")


async def execute_catalog_search(
    search_query: Optional[str] = None,
    max_price: Optional[float] = None,
    min_price: Optional[float] = None,
    merchant_id: Optional[int] = None,
    category: Optional[str] = None,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Search the merchant catalog via FastAPI backend.
    """
    try:
        products: List[ProductResult] = await backend_client.search_catalog(
            search=search_query,
            max_price=max_price,
            min_price=min_price,
            merchant_id=merchant_id,
            category=category,
            limit=limit
        )
        return {
            "success": True,
            "count": len(products),
            "products": [p.model_dump() for p in products]
        }
    except Exception as e:
        logger.error(f"Catalog search error: {e}")
        return {
            "success": False,
            "error": str(e),
            "count": 0,
            "products": []
        }


@tool
async def catalog_search(
    search_query: Optional[str] = None,
    max_price: Optional[float] = None,
    merchant_id: Optional[int] = None
) -> str:
    """
    Search the merchant's product catalog for products matching a query or budget constraint.
    Input arguments:
    - search_query: Keywords to search for (e.g. 'laptop', 'headphone')
    - max_price: Maximum allowed price in INR (e.g. 70000)
    - merchant_id: Merchant ID filter (optional, default 1)
    
    Returns structured JSON with matching products, prices, ratings, and stock.
    """
    result = await execute_catalog_search(
        search_query=search_query,
        max_price=max_price,
        merchant_id=merchant_id
    )
    return json.dumps(result)
