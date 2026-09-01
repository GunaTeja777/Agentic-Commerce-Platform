import pytest
import respx
import httpx
from app.config import settings
from app.services.backend_client import backend_client, PolicyServiceUnavailableError
from app.tools.catalog_tool import execute_catalog_search
from app.tools.growth_tool import execute_growth_recommendation
from app.tools.policy_tool import execute_policy_check


@pytest.mark.asyncio
async def test_catalog_tool_calls_backend_correctly(respx_mock):
    """Test 1: Catalog tool calls backend GET /api/products and structures data."""
    respx_mock.get(url__startswith=f"{settings.BACKEND_URL}/api/products").mock(
        return_value=httpx.Response(
            200,
            json={
                "total": 1,
                "items": [
                    {
                        "product_id": 1001,
                        "product_name": "NovaBook Pro 14",
                        "price_inr": 65000.0,
                        "stock_quantity": 12,
                        "category": "Laptops",
                        "rating": 4.8,
                        "description": "High performance laptop",
                        "tags": ["laptop", "ultrabook"]
                    }
                ],
                "limit": 10,
                "offset": 0
            }
        )
    )

    result = await execute_catalog_search(search_query="laptop", max_price=70000, merchant_id=1)
    assert result["success"] is True
    assert result["count"] == 1
    assert result["products"][0]["product_id"] == 1001
    assert result["products"][0]["product_name"] == "NovaBook Pro 14"
    assert result["products"][0]["price_inr"] == 65000.0


@pytest.mark.asyncio
async def test_growth_tool_returns_backend_recommendations(respx_mock):
    """Test 2: Growth tool returns data-backed recommendations from backend."""
    respx_mock.get(url__startswith=f"{settings.BACKEND_URL}/api/growth/recommendations/1001").mock(
        return_value=httpx.Response(
            200,
            json={
                "base_product": {
                    "id": 1001,
                    "name": "NovaBook Pro 14",
                    "price_inr": 65000.0
                },
                "recommendations": [
                    {
                        "id": 1010,
                        "name": "AeroMouse X1",
                        "price_inr": 1500.0,
                        "stock": 25,
                        "relationship_type": "frequently_bought_with",
                        "reason": "Frequently bought with NovaBook Pro 14"
                    }
                ]
            }
        )
    )

    result = await execute_growth_recommendation(product_id=1001)
    assert result["success"] is True
    assert len(result["recommendations"]) == 1
    rec = result["recommendations"][0]
    assert rec["id"] == 1010
    assert rec["name"] == "AeroMouse X1"
    assert rec["price_inr"] == 1500.0
    assert rec["reason"] == "Frequently bought with NovaBook Pro 14"


@pytest.mark.asyncio
async def test_policy_tool_returns_authoritative_allowed_result(respx_mock):
    """Test 3a: Policy tool returns authoritative ALLOWED result."""
    respx_mock.post(url__startswith=f"{settings.BACKEND_URL}/api/policies/check").mock(
        return_value=httpx.Response(
            200,
            json={
                "allowed": True,
                "reason": "Transaction is within the allowed limit",
                "max_transaction_inr": 70000.0,
                "requested_amount_inr": 66500.0
            }
        )
    )

    result = await execute_policy_check(merchant_id=1, amount_inr=66500.0)
    assert result["success"] is True
    assert result["allowed"] is True
    assert result["policy_service_error"] is False
    assert result["requested_amount_inr"] == 66500.0


@pytest.mark.asyncio
async def test_policy_tool_returns_authoritative_blocked_result(respx_mock):
    """Test 3b: Policy tool returns authoritative BLOCKED result."""
    respx_mock.post(url__startswith=f"{settings.BACKEND_URL}/api/policies/check").mock(
        return_value=httpx.Response(
            200,
            json={
                "allowed": False,
                "reason": "Transaction exceeds maximum transaction limit",
                "max_transaction_inr": 70000.0,
                "requested_amount_inr": 79000.0
            }
        )
    )

    result = await execute_policy_check(merchant_id=1, amount_inr=79000.0)
    assert result["success"] is True
    assert result["allowed"] is False
    assert "exceeds maximum" in result["reason"]


@pytest.mark.asyncio
async def test_policy_tool_fails_closed_on_backend_error(respx_mock):
    """Test 10: Policy tool fails closed when backend is unreachable or errors."""
    respx_mock.post(url__startswith=f"{settings.BACKEND_URL}/api/policies/check").mock(
        return_value=httpx.Response(500, text="Internal Server Error")
    )

    result = await execute_policy_check(merchant_id=1, amount_inr=65000.0)
    assert result["success"] is False
    assert result["allowed"] is False
    assert result["policy_service_error"] is True
    assert "Policy verification failed" in result["reason"]
