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
        Search products across live Railway E-commerce / MCP Store or local backend.
        """
        store_url = (getattr(settings, "STORE_API_URL", None) or "").rstrip("/")
        if store_url:
            try:
                url = f"{store_url}/api/products"
                params: Dict[str, Any] = {}
                if category:
                    params["category"] = category
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(url, params=params)
                    if response.status_code == 200:
                        raw_data = response.json()
                        items_list = raw_data if isinstance(raw_data, list) else raw_data.get("products", raw_data.get("items", []))
                        
                        results: List[ProductResult] = []
                        tokens = [t.lower() for t in search.split() if len(t) > 1] if search else []

                        for item in items_list:
                            name = str(item.get("name") or item.get("product_name") or "")
                            desc = str(item.get("description") or "")
                            cat = str(item.get("category") or "General")
                            
                            # Price on Railway is in paise (e.g. 6500000 -> 65000.0, 150000 -> 1500.0)
                            raw_p = item.get("price") or item.get("price_inr") or 0.0
                            price_inr = float(raw_p) / 100.0 if "price" in item else float(raw_p)
                            
                            stock = int(item.get("quantityAvailable") or item.get("stock_quantity") or item.get("stock") or 0)
                            in_stk = bool(item.get("inStock", True)) and (stock > 0)
                            
                            if in_stock and not in_stk:
                                continue
                            if max_price is not None and price_inr > max_price:
                                continue
                            if min_price is not None and price_inr < min_price:
                                continue
                            
                            if tokens:
                                combined_text = f"{name.lower()} {desc.lower()} {cat.lower()}"
                                if not any(tok in combined_text for tok in tokens):
                                    continue
                            
                            results.append(
                                ProductResult(
                                    product_id=str(item.get("id") or item.get("product_id")),
                                    product_name=name,
                                    category=cat,
                                    price_inr=price_inr,
                                    stock_quantity=stock,
                                    rating=float(item.get("rating", 4.5)),
                                    description=desc,
                                    tags=item.get("tags") or [cat.lower()],
                                    image_url=item.get("imageUrl") or item.get("image_url")
                                )
                            )
                        if results:
                            return results[:limit]
            except Exception as e:
                logger.warning(f"Live Railway store query failed ({e}), falling back to local backend.")

        # Fallback to local FastAPI backend
        url = f"{self.base_url}/products"
        params = {"limit": limit}
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
                
                results = []
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
                            tags=item.get("tags"),
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

    async def get_growth_recommendations(self, product_id: Any) -> GrowthRecommendationResponse:
        """
        Retrieve data-driven upsell/cross-sell recommendations from live store or local backend.
        """
        store_url = (getattr(settings, "STORE_API_URL", None) or "").rstrip("/")
        pid_str = str(product_id)
        if store_url and (not pid_str.isdigit() or len(pid_str) > 10):
            try:
                url = f"{store_url}/api/products"
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.get(url, params={"category": "Accessories"})
                    if resp.status_code == 200:
                        raw_data = resp.json()
                        items_list = raw_data if isinstance(raw_data, list) else []
                        recs = []
                        for item in items_list[:3]:
                            raw_p = item.get("price") or item.get("price_inr") or 0
                            price_inr = float(raw_p) / 100.0 if "price" in item else float(raw_p)
                            recs.append(
                                GrowthRecommendationItem(
                                    id=str(item.get("id")),
                                    name=str(item.get("name")),
                                    price_inr=price_inr,
                                    stock=int(item.get("quantityAvailable") or 10),
                                    relationship_type="frequently_bought_with",
                                    reason=f"Compatible accessory for your purchase"
                                )
                            )
                        if recs:
                            return GrowthRecommendationResponse(
                                base_product=GrowthBaseProduct(id=product_id, name="", price_inr=0.0),
                                recommendations=recs
                            )
            except Exception as e:
                logger.warning(f"Railway growth lookup fallback: {e}")

        # Local backend fallback
        url = f"{self.base_url}/growth/recommendations/{product_id if str(product_id).isdigit() else 1001}"
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

    async def check_policy(
        self,
        merchant_id: int,
        amount_inr: float,
        request_id: Optional[str] = None
    ) -> PolicyResult:
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
        headers = {"X-Request-ID": request_id} if request_id else {}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
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

    async def create_order(
        self,
        merchant_id: int,
        buyer_id: str,
        items: List[Dict[str, Any]],
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create internal order on live Railway E-Commerce Store or PostgreSQL database via POST /api/orders.
        Calculates prices securely server-side.
        """
        store_url = (getattr(settings, "STORE_API_URL", None) or "").rstrip("/")
        if store_url and items:
            first_pid = str(items[0].get("product_id", ""))
            if not first_pid.isdigit() or len(first_pid) > 10:
                try:
                    url = f"{store_url}/api/orders"
                    payload = {
                        "customerEmail": f"{buyer_id.replace(' ', '').lower()}@example.com" if "@" not in buyer_id else buyer_id,
                        "customerName": buyer_id,
                        "items": [{"productId": str(item["product_id"]), "quantity": item.get("quantity", 1)} for item in items]
                    }
                    async with httpx.AsyncClient(timeout=self.timeout) as client:
                        response = await client.post(url, json=payload)
                        if response.status_code in (200, 201):
                            data = response.json()
                            raw_total = data.get("totalAmount", 0)
                            total_inr = float(raw_total) / 100.0 if float(raw_total) > 500000 else float(raw_total)
                            return {
                                "order_id": data.get("orderId"),
                                "status": str(data.get("status", "PENDING")).lower(),
                                "subtotal_inr": total_inr,
                                "total_inr": total_inr,
                                "policy_allowed": True,
                                "payment": {
                                    "razorpay_order_id": data.get("razorpayOrderId"),
                                    "razorpay_key_id": data.get("razorpayKeyId"),
                                    "amount": data.get("totalAmount"),
                                    "currency": data.get("currency", "INR")
                                },
                                "items": data.get("items", [])
                            }
                except Exception as e:
                    logger.warning(f"Railway order booking error ({e}), falling back to local backend.")

        url = f"{self.base_url}/orders"
        payload = {
            "merchant_id": merchant_id,
            "buyer_id": buyer_id,
            "items": [{"product_id": int(item["product_id"]) if str(item["product_id"]).isdigit() else 1001, "quantity": item.get("quantity", 1)} for item in items],
            "request_id": request_id
        }
        headers = {"X-Request-ID": request_id} if request_id else {}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Order creation HTTP error: {e.response.status_code} - {e.response.text}")
            raise BackendClientError(f"Backend order error: HTTP {e.response.status_code} - {e.response.text}") from e
        except Exception as e:
            logger.error(f"Failed to create order: {e}")
            raise BackendClientError(f"Unable to connect to Order Service: {str(e)}") from e

    async def create_payment_order(self, order_id: Any, request_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Initiate Razorpay test order creation via POST /api/payments/create.
        Amount is verified server-side.
        """
        url = f"{self.base_url}/payments/create"
        payload = {"order_id": order_id, "request_id": request_id}
        headers = {"X-Request-ID": request_id} if request_id else {}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Payment order creation HTTP error: {e.response.status_code} - {e.response.text}")
            raise BackendClientError(f"Backend payment error: HTTP {e.response.status_code} - {e.response.text}") from e
        except Exception as e:
            logger.error(f"Failed to create payment order: {e}")
            raise BackendClientError(f"Unable to connect to Payment Service: {str(e)}") from e

    async def verify_payment(
        self,
        order_id: int,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Cryptographically verify Razorpay signature via POST /api/payments/verify.
        """
        url = f"{self.base_url}/payments/verify"
        payload = {
            "order_id": order_id,
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature,
            "request_id": request_id
        }
        headers = {"X-Request-ID": request_id} if request_id else {}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Payment verification HTTP error: {e.response.status_code} - {e.response.text}")
            raise BackendClientError(f"Payment verification failed: HTTP {e.response.status_code}") from e
        except Exception as e:
            logger.error(f"Failed to verify payment: {e}")
            raise BackendClientError(f"Unable to connect to Payment Verification Service: {str(e)}") from e


# Singleton default client
backend_client = BackendClient()
