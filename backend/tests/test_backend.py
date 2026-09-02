import pytest

@pytest.mark.asyncio
async def test_health_check(async_client):
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"

@pytest.mark.asyncio
async def test_get_products(async_client):
    response = await async_client.get("/api/products")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data
    assert data["total"] >= 1
    assert len(data["items"]) > 0

@pytest.mark.asyncio
async def test_search_products(async_client):
    response = await async_client.get("/api/products?search=laptop")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for item in data["items"]:
        name_or_cat = (item["product_name"] + item["category"] + (item["tags"] or "")).lower()
        assert "laptop" in name_or_cat

@pytest.mark.asyncio
async def test_get_product_detail(async_client):
    response = await async_client.get("/api/products/1001")
    assert response.status_code == 200
    data = response.json()
    assert data["product_id"] == 1001
    assert "price_inr" in data
    assert "compatible_products" in data
    assert "frequently_bought_together" in data

@pytest.mark.asyncio
async def test_get_product_recommendations(async_client):
    # Catalog recommendation endpoint
    response = await async_client.get("/api/products/1001/recommendations")
    assert response.status_code == 200
    data = response.json()
    assert data["product_id"] == 1001
    assert "recommendations" in data
    assert isinstance(data["recommendations"], list)

    # Growth service endpoint
    growth_resp = await async_client.get("/api/growth/recommendations/1001")
    assert growth_resp.status_code == 200
    growth_data = growth_resp.json()
    assert growth_data["base_product"]["id"] == 1001
    assert "recommendations" in growth_data

@pytest.mark.asyncio
async def test_policy_allows_valid_transaction(async_client):
    payload = {"merchant_id": 1, "amount_inr": 66500}
    response = await async_client.post("/api/policies/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is True
    assert "within the allowed limit" in data["reason"]

@pytest.mark.asyncio
async def test_policy_blocks_excessive_transaction(async_client):
    payload = {"merchant_id": 1, "amount_inr": 75000}
    response = await async_client.post("/api/policies/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is False
    assert "exceeds" in data["reason"]

@pytest.mark.asyncio
async def test_order_server_side_price_and_stock(async_client):
    # Create valid order within limit (NovaBook Pro 14: ₹65,000 x 1)
    payload = {
        "merchant_id": 1,
        "buyer_id": "test-buyer",
        "items": [
            {"product_id": 1001, "quantity": 1}
        ]
    }
    response = await async_client.post("/api/orders", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["policy_allowed"] is True
    assert data["total_inr"] == 65000.0
    assert data["status"] == "created"
    assert data["transaction"]["status"] == "pending"
    assert data["transaction"]["provider"] == "razorpay"

@pytest.mark.asyncio
async def test_order_rejects_insufficient_stock(async_client):
    payload = {
        "merchant_id": 1,
        "buyer_id": "test-buyer",
        "items": [
            {"product_id": 1001, "quantity": 99999}
        ]
    }
    response = await async_client.post("/api/orders", json=payload)
    assert response.status_code == 400
    assert "Insufficient stock" in str(response.json()["detail"])

@pytest.mark.asyncio
async def test_blocked_transaction_does_not_create_payable(async_client):
    # Order exceeding ₹70,000 max_transaction_inr limit (NovaBook Pro 16: ₹89,000 x 1)
    payload = {
        "merchant_id": 1,
        "buyer_id": "test-buyer-blocked",
        "items": [
            {"product_id": 1003, "quantity": 1}
        ]
    }
    response = await async_client.post("/api/orders", json=payload)
    assert response.status_code == 403
    err_data = response.json()["detail"]
    assert "Transaction blocked by merchant policy" in err_data["error"]
    assert err_data["amount_inr"] == 89000.0

@pytest.mark.asyncio
async def test_audit_logs_creation(async_client):
    response = await async_client.get("/api/audit?merchant_id=1")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    actions = [log["action"] for log in data["items"]]
    assert any(a in actions for a in ["policy_checked", "order_created", "transaction_blocked", "growth_recommendation_created"])
