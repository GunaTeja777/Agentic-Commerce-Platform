import hmac
import hashlib
import pytest
from unittest.mock import patch
from app.core.config import settings


def generate_test_signature(order_id: str, payment_id: str, secret: str) -> str:
    """Helper to generate valid Razorpay HMAC SHA256 test signature."""
    msg = f"{order_id}|{payment_id}"
    return hmac.new(secret.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256).hexdigest()


@pytest.mark.asyncio
async def test_sec_1_frontend_cannot_override_price(async_client):
    """
    Security Test 1: Frontend/client attempts to pass forged prices.
    Backend must calculate prices strictly from PostgreSQL product table.
    """
    payload = {
        "merchant_id": 1,
        "buyer_id": "malicious-client-price-override",
        "items": [
            {"product_id": 1001, "quantity": 1, "price_inr": 1.0, "unit_price": 1.0}  # Attempted override to ₹1
        ]
    }
    response = await async_client.post("/api/orders", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["total_inr"] == 65000.0  # Authoritative DB price for NovaBook Pro 14
    assert data["subtotal_inr"] == 65000.0


@pytest.mark.asyncio
async def test_sec_2_frontend_cannot_override_policy_result(async_client):
    """
    Security Test 2: Client passes 'policy_allowed: true' for a transaction exceeding policy limit.
    Backend must re-evaluate policy deterministically and reject with 403.
    """
    payload = {
        "merchant_id": 1,
        "buyer_id": "malicious-client-policy-override",
        "items": [
            {"product_id": 1003, "quantity": 1}  # NovaBook Pro 16 = ₹89,000 > ₹70,000 limit
        ],
        "policy_allowed": True,
        "policy_override": True
    }
    response = await async_client.post("/api/orders", json=payload)
    assert response.status_code == 403
    err = response.json()["detail"]
    assert err["error_code"] == "POLICY_BLOCKED" or "Transaction blocked" in err.get("error", "")


@pytest.mark.asyncio
async def test_sec_3_llm_cannot_directly_access_razorpay(async_client):
    """
    Security Test 3: LLM / Agent cannot generate payments without backend PostgreSQL order validation.
    Payment endpoint strictly requires a verified, policy-approved order_id.
    """
    # Direct attempt with fake order ID must return 404 ORDER_NOT_FOUND
    response = await async_client.post("/api/payments/create", json={"order_id": 9999999})
    assert response.status_code == 404
    assert "ORDER_NOT_FOUND" in str(response.json()) or "not found" in str(response.json()).lower()


@pytest.mark.asyncio
async def test_sec_4_policy_block_prevents_payment_and_no_razorpay_call(async_client):
    """
    Security Test 4: Blocked policy ensures Razorpay is NOT called (razorpay_call_count == 0).
    """
    # 1. Create blocked order
    order_payload = {
        "merchant_id": 1,
        "buyer_id": "test-buyer-blocked",
        "items": [{"product_id": 1003, "quantity": 1}]
    }
    order_resp = await async_client.post("/api/orders", json=order_payload)
    assert order_resp.status_code == 403
    blocked_order_id = order_resp.json()["detail"]["order_id"]

    # 2. Attempt to call payment create with mocked razorpay client to assert call count
    with patch("app.services.payment_service.PaymentService.get_razorpay_client") as mock_client:
        pay_resp = await async_client.post("/api/payments/create", json={"order_id": blocked_order_id})
        assert pay_resp.status_code == 403
        assert mock_client.call_count == 0  # CRITICAL: Razorpay was NOT called


@pytest.mark.asyncio
async def test_sec_5_policy_service_failure_prevents_payment_fail_closed(async_client):
    """
    Security Test 5: If policy service fails or is unreachable, backend fails CLOSED.
    Razorpay MUST NOT be called.
    """
    # Create valid order
    order_resp = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "test-buyer-fail-closed",
        "items": [{"product_id": 1021, "quantity": 1}]
    })
    assert order_resp.status_code == 201
    order_id = order_resp.json()["order_id"]

    # Mock PolicyService to simulate policy service outage
    with patch("app.services.payment_service.PolicyService.check_policy") as mock_policy:
        mock_policy.return_value = {
            "allowed": False,
            "reason": "Policy service offline (503)",
            "max_transaction_inr": 0.0
        }
        with patch("app.services.payment_service.PaymentService.get_razorpay_client") as mock_razorpay:
            pay_resp = await async_client.post("/api/payments/create", json={"order_id": order_id})
            assert pay_resp.status_code == 403
            assert mock_razorpay.call_count == 0  # Razorpay NOT called


@pytest.mark.asyncio
async def test_sec_6_invalid_unknown_product_cannot_create_order(async_client):
    """
    Security Test 6: Non-existent product ID returns 404 PRODUCT_NOT_FOUND.
    """
    resp = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "test-unknown-prod",
        "items": [{"product_id": 888888, "quantity": 1}]
    })
    assert resp.status_code == 404
    assert "PRODUCT_NOT_FOUND" in str(resp.json()) or "not found" in str(resp.json()).lower()


@pytest.mark.asyncio
async def test_sec_7_inactive_product_cannot_create_order(async_client):
    """
    Security Test 7: Inactive product cannot be purchased (returns 400 PRODUCT_INACTIVE).
    """
    from sqlalchemy import update
    from app.core.database import AsyncSessionLocal
    from app.models.product import Product

    # Temporarily set product 1021 to inactive
    async with AsyncSessionLocal() as session:
        await session.execute(update(Product).where(Product.product_id == 1021).values(is_active=False))
        await session.commit()

    resp = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "test-inactive-prod",
        "items": [{"product_id": 1021, "quantity": 1}]
    })
    assert resp.status_code == 400
    assert "PRODUCT_INACTIVE" in str(resp.json()) or "inactive" in str(resp.json()).lower()

    # Restore product 1021
    async with AsyncSessionLocal() as session:
        await session.execute(update(Product).where(Product.product_id == 1021).values(is_active=True))
        await session.commit()


@pytest.mark.asyncio
async def test_sec_8_insufficient_stock_prevents_order(async_client):
    """
    Security Test 8: Insufficient stock returns 400 INSUFFICIENT_STOCK.
    """
    resp = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "test-stock-depleted",
        "items": [{"product_id": 1001, "quantity": 99999}]
    })
    assert resp.status_code == 400
    assert "INSUFFICIENT_STOCK" in str(resp.json()) or "insufficient stock" in str(resp.json()).lower()


@pytest.mark.asyncio
async def test_sec_9_duplicate_payment_is_prevented(async_client):
    """
    Security Test 9: An order that is already captured/paid cannot be paid again.
    """
    order_resp = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "test-duplicate-pay",
        "items": [{"product_id": 1021, "quantity": 1}]
    })
    assert order_resp.status_code == 201
    order_id = order_resp.json()["order_id"]

    # 1. Create payment order
    pay_resp = await async_client.post("/api/payments/create", json={"order_id": order_id})
    assert pay_resp.status_code == 200
    rzp_order_id = pay_resp.json()["razorpay_order_id"]

    # 2. Verify payment
    sig = generate_test_signature(rzp_order_id, "pay_dup_test_123", settings.RAZORPAY_KEY_SECRET)
    verify_resp = await async_client.post("/api/payments/verify", json={
        "order_id": order_id,
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": "pay_dup_test_123",
        "razorpay_signature": sig
    })
    assert verify_resp.status_code == 200

    # 3. Attempt second payment on paid order -> must be rejected with 400
    repay_resp = await async_client.post("/api/payments/create", json={"order_id": order_id})
    assert repay_resp.status_code == 400
    assert "already paid" in repay_resp.text.lower() or "PAYMENT_ALREADY_COMPLETED" in repay_resp.text


@pytest.mark.asyncio
async def test_sec_10_invalid_razorpay_signature_rejected(async_client):
    """
    Security Test 10: Invalid HMAC SHA-256 signature is strictly rejected.
    """
    order_resp = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "test-bad-sig",
        "items": [{"product_id": 1021, "quantity": 1}]
    })
    order_id = order_resp.json()["order_id"]

    pay_resp = await async_client.post("/api/payments/create", json={"order_id": order_id})
    rzp_order_id = pay_resp.json()["razorpay_order_id"]

    verify_resp = await async_client.post("/api/payments/verify", json={
        "order_id": order_id,
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": "pay_forged_999",
        "razorpay_signature": "forged_invalid_signature_hash"
    })
    assert verify_resp.status_code == 400
    assert "INVALID_PAYMENT_SIGNATURE" in str(verify_resp.json()) or "invalid payment signature" in verify_resp.text.lower()


@pytest.mark.asyncio
async def test_sec_11_invalid_webhook_signature_rejected(async_client):
    """
    Security Test 11: Webhooks with invalid signatures are rejected with 400.
    """
    body = b'{"event": "payment.captured", "payload": {}}'
    resp = await async_client.post(
        "/api/payments/webhook",
        content=body,
        headers={"X-Razorpay-Signature": "invalid_forged_webhook_signature"}
    )
    assert resp.status_code == 400
    assert "INVALID_WEBHOOK_SIGNATURE" in str(resp.json()) or "invalid webhook signature" in resp.text.lower()


@pytest.mark.asyncio
async def test_sec_12_payment_failure_does_not_become_captured(async_client):
    """
    Security Test 12: Failed payment does NOT mark order/transaction captured.
    """
    order_resp = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "test-fail-capture",
        "items": [{"product_id": 1021, "quantity": 1}]
    })
    order_id = order_resp.json()["order_id"]

    fail_resp = await async_client.post("/api/payments/fail", json={
        "order_id": order_id,
        "reason": "Test card declined"
    })
    assert fail_resp.status_code == 200
    assert fail_resp.json()["status"] == "failed"

    # Verify order state remains failed, not captured
    get_order = await async_client.get(f"/api/orders/{order_id}")
    assert get_order.status_code == 200
    order_data = get_order.json()
    assert order_data["status"] == "failed"
    if order_data.get("transaction"):
        assert order_data["transaction"]["status"] == "failed"


@pytest.mark.asyncio
async def test_sec_13_razorpay_secret_never_exposed(async_client):
    """
    Security Test 13: RAZORPAY_KEY_SECRET never appears in API responses, order details, or audit logs.
    """
    order_resp = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "test-secret-leak",
        "items": [{"product_id": 1021, "quantity": 1}]
    })
    order_id = order_resp.json()["order_id"]

    pay_resp = await async_client.post("/api/payments/create", json={"order_id": order_id})
    assert pay_resp.status_code == 200
    assert settings.RAZORPAY_KEY_SECRET not in pay_resp.text

    audit_resp = await async_client.get("/api/audit?merchant_id=1")
    assert audit_resp.status_code == 200
    assert settings.RAZORPAY_KEY_SECRET not in audit_resp.text


@pytest.mark.asyncio
async def test_sec_14_correlation_request_id_traced(async_client):
    """
    Security Test 14: Traceable correlation/request_id is preserved in order and audit trail.
    """
    req_id = "demo-transaction-trace-001"
    order_resp = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "test-trace-buyer",
        "items": [{"product_id": 1021, "quantity": 1}],
        "request_id": req_id
    })
    assert order_resp.status_code == 201
    assert order_resp.json()["request_id"] == req_id

    order_id = order_resp.json()["order_id"]
    pay_resp = await async_client.post("/api/payments/create", json={
        "order_id": order_id,
        "request_id": req_id
    })
    assert pay_resp.status_code == 200
    assert pay_resp.json()["request_id"] == req_id

    # Verify audit logs contain the request_id in metadata
    audit_resp = await async_client.get("/api/audit?merchant_id=1")
    assert audit_resp.status_code == 200
    items = audit_resp.json()["items"]
    matched = [item for item in items if (item.get("metadata_json") or {}).get("request_id") == req_id]
    assert len(matched) > 0
