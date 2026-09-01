import logging
from typing import List, Optional, Dict, Any
import httpx

from app.config import settings
from app.schemas.agent_schemas import (
    ProductResult,
    GrowthRecommendationResponse,
    GrowthRecommendationItem,
    GrowthBaseProduct,
    PolicyResult,
)

logger = logging.getLogger("agent.backend_client")


class BackendClientError(Exception):
    """Base exception for backend communication failures."""
    pass


class PolicyServiceUnavailableError(BackendClientError):
    """Exception raised when the Policy Engine cannot be reached or returns an error."""
    pass


class BackendClient:
    """HTTP Client for communicating with the FastAPI Commerce Backend."""

    def __init__(self, base_url: Optional[str] = None, timeout: float = 10.0):
        self.base_url = (base_url or settings.api_base_url).rstrip("/")
        self.timeout = timeout

    async def search_catalog(
        self,
        search: Optional[str] = None,
        max_price: Optional[float] = None,
        min_price: Optional[float] = None,
        merchant_id: Optional[int] = None,
        category: Optional[str] = None,
        in_stock: Optional[bool] = True,
        limit: int = 10
    ) -> List[ProductResult]:
        """
        Search products in the merchant catalog via FastAPI GET /api/products.
        """
        url = f"{self.base_url}/products"
        params: Dict[str, Any] = {"limit": limit}
        if search:
            params["search"] = search
        if max_price is not None:
            params["max_price"] = max_price
        if min_price is not None:
            params["min_price"] = min_price
        if merchant_id is not None:
            params["merchant_id"] = merchant_id
        if category:
            params["category"] = category
        if in_stock is not None:
            params["in_stock"] = str(in_stock).lower()

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                items = data.get("items", [])
                
                results: List[ProductResult] = []
                for item in items:
                    results.append(
                        ProductResult(
                            product_id=item.get("product_id") or item.get("id"),
                            product_name=item.get("product_name") or item.get("name", ""),
                            category=item.get("category", "General"),
                            price_inr=float(item.get("price_inr", 0.0)),
                            stock_quantity=int(item.get("stock_quantity", 0)),
                            rating=float(item.get("rating", 0.0)) if item.get("rating") is not None else 0.0,
                            description=item.get("description"),
                            tags=item.get("tags") or [],
                            image_url=item.get("image_url")
                        )
                    )
                return results
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP status error while searching catalog: {e.response.status_code} - {e.response.text}")
            raise BackendClientError(f"Backend catalog error: HTTP {e.response.status_code}") from e
        except Exception as e:
            logger.error(f"Connection error while searching catalog: {e}")
            raise BackendClientError(f"Unable to connect to Catalog Service: {str(e)}") from e

    async def get_growth_recommendations(self, product_id: int) -> GrowthRecommendationResponse:
        """
        Retrieve data-driven upsell/cross-sell recommendations via FastAPI GET /api/growth/recommendations/{product_id}.
        """
        url = f"{self.base_url}/growth/recommendations/{product_id}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                if response.status_code == 404:
                    logger.warning(f"No growth recommendations found for product_id {product_id}")
                    return GrowthRecommendationResponse(
                        base_product=GrowthBaseProduct(id=product_id, name="", price_inr=0.0),
                        recommendations=[]
                    )
                response.raise_for_status()
                data = response.json()
                
                base = data.get("base_product", {})
                base_product = GrowthBaseProduct(
                    id=base.get("id", product_id),
                    name=base.get("name", ""),
                    price_inr=float(base.get("price_inr", 0.0))
                )
                
                raw_recs = data.get("recommendations", [])
                recs: List[GrowthRecommendationItem] = []
                for r in raw_recs:
                    rel_type = r.get("relationship_type") or r.get("type", "frequently_bought_with")
                    recs.append(
                        GrowthRecommendationItem(
                            id=r.get("id") or r.get("product_id"),
                            name=r.get("name") or r.get("product_name", ""),
                            price_inr=float(r.get("price_inr", 0.0)),
                            stock=int(r.get("stock") or r.get("stock_quantity", 0)),
                            relationship_type=rel_type,
                            reason=r.get("reason", "")
                        )
                    )
                return GrowthRecommendationResponse(
                    base_product=base_product,
                    recommendations=recs
                )
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP status error while fetching recommendations: {e.response.status_code}")
            raise BackendClientError(f"Backend growth recommendation error: HTTP {e.response.status_code}") from e
        except Exception as e:
            logger.error(f"Connection error fetching recommendations: {e}")
            raise BackendClientError(f"Unable to connect to Growth Recommendation Service: {str(e)}") from e

    async def check_policy(self, merchant_id: int, amount_inr: float) -> PolicyResult:
        """
        Evaluate transaction against merchant limit policy via FastAPI POST /api/policies/check.
        CRITICAL: This check is deterministic and authoritative.
        Failures are treated as FAIL-CLOSED.
        """
        url = f"{self.base_url}/policies/check"
        payload = {
            "merchant_id": merchant_id,
            "amount_inr": amount_inr
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
                return PolicyResult(
                    allowed=bool(data.get("allowed", False)),
                    reason=str(data.get("reason", "")),
                    max_transaction_inr=float(data.get("max_transaction_inr", 0.0)),
                    requested_amount_inr=float(data.get("requested_amount_inr", amount_inr))
                )
        except httpx.HTTPStatusError as e:
            logger.error(f"Policy service HTTP error: {e.response.status_code} - {e.response.text}")
            raise PolicyServiceUnavailableError(f"Policy service returned error code {e.response.status_code}") from e
        except Exception as e:
            logger.error(f"Policy service unreachable / failed: {e}")
            raise PolicyServiceUnavailableError(f"Policy engine unavailable: {str(e)}") from e


# Singleton default client
backend_client = BackendClient()
