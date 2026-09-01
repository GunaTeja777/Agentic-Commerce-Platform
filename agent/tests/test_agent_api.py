import pytest
import respx
import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.schemas.agent_schemas import AgentStatus

client = TestClient(app)


def test_agent_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_agent_chat_api_awaiting_approval(respx_mock):
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
                        "stock_quantity": 10,
                        "category": "Laptops"
                    }
                ]
            }
        )
    )

    respx_mock.get(url__startswith=f"{settings.BACKEND_URL}/api/growth/recommendations/1001").mock(
        return_value=httpx.Response(
            200,
            json={
                "base_product": {"id": 1001, "name": "NovaBook Pro 14", "price_inr": 65000.0},
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

    payload = {
        "merchant_id": 1,
        "buyer_id": "buyer-test-1",
        "message": "I need a laptop under 70000"
    }

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/agent/chat", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == AgentStatus.AWAITING_BUYER_APPROVAL.value
    assert len(data["recommendations"]) == 1
    assert data["selected_product"]["product_id"] == 1001
