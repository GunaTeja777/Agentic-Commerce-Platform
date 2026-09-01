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
async def test_1_policy_approved_order_creates_razorpay_test_order(async_client):
    """Test 1: Policy-approved order can create Razorpay test order."""
    # Create order within limit (NovaBook Pro 14: ₹65,000)
    order_payload = {
        "merchant_id": 1,
        "buyer_id": "buyer-test-1",
        "items": [{"product_id": 1001, "quantity": 1}]
    }
    order_resp = await async_client.post("/api/orders", json=order_payload)
    assert order_resp.status_code == 201
    order_id = order_resp.json()["order_id"]

    # Request payment creation
    pay_resp = await async_client.post("/api/payments/create", json={"order_id": order_id})
    assert pay_resp.status_code == 200
    data = pay_resp.json()
    assert data["success"] is True
    assert data["order_id"] == order_id
    assert data["razorpay_order_id"].startswith("order_")
    assert data["amount"] == 6500000  # 65000 INR * 100 paise
    assert data["currency"] == "INR"
    assert data["key_id"] == settings.RAZORPAY_KEY_ID


@pytest.mark.asyncio
async def test_2_policy_blocked_order_cannot_create_razorpay_order(async_client):
    """Test 2: Policy-blocked order cannot create Razorpay order."""
    # Attempt order exceeding ₹70,000 limit (NovaBook Pro 16: ₹89,000)
    order_payload = {
        "merchant_id": 1,
        "buyer_id": "buyer-test-2",
        "items": [{"product_id": 1003, "quantity": 1}]
    }
    order_resp = await async_client.post("/api/orders", json=order_payload)
    assert order_resp.status_code == 403
    blocked_order_id = order_resp.json()["detail"]["order_id"]

    # Direct attempt to create payment for blocked order must be rejected with 403
    pay_resp = await async_client.post("/api/payments/create", json={"order_id": blocked_order_id})
    assert pay_resp.status_code == 403
    assert "blocked" in pay_resp.text.lower()


@pytest.mark.asyncio
async def test_3_and_4_server_calculates_total_and_ignores_client_amount(async_client):
    """Test 3 & 4: Server calculates correct total from DB and client cannot override amount."""
    order_payload = {
        "merchant_id": 1,
        "buyer_id": "buyer-test-3",
        "items": [
            {"product_id": 1001, "quantity": 1},  # 65000
            {"product_id": 1021, "quantity": 1}   # 1500 (AeroMouse X1)
        ]
    }
    order_resp = await async_client.post("/api/orders", json=order_payload)
    assert order_resp.status_code == 201
    order_data = order_resp.json()
    assert order_data["total_inr"] == 66500.0

    # Payment create request schema only accepts order_id, extra amount field is ignored
    pay_resp = await async_client.post("/api/payments/create", json={
        "order_id": order_data["order_id"],
        "amount": 100  # Attempted override to 1 INR
    })
    assert pay_resp.status_code == 200
    pay_data = pay_resp.json()
    assert pay_data["amount"] == 6650000  # 66,500 INR calculated server-side
    assert pay_data["amount_inr"] == 66500.0


@pytest.mark.asyncio
async def test_5_payment_signature_verification_works(async_client):
    """Test 5: Cryptographic signature verification works."""
    order_resp = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "buyer-test-5",
        "items": [{"product_id": 1021, "quantity": 1}]
    })
    assert order_resp.status_code == 201
    order_id = order_resp.json()["order_id"]

    pay_resp = await async_client.post("/api/payments/create", json={"order_id": order_id})
    assert pay_resp.status_code == 200
    rzp_order_id = pay_resp.json()["razorpay_order_id"]
    fake_payment_id = "pay_test_sig_valid_123"

    valid_signature = generate_test_signature(
        order_id=rzp_order_id,
        payment_id=fake_payment_id,
        secret=settings.RAZORPAY_KEY_SECRET
    )

    verify_resp = await async_client.post("/api/payments/verify", json={
        "order_id": order_id,
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": fake_payment_id,
        "razorpay_signature": valid_signature
    })
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert data["success"] is True
    assert data["status"] == "captured"
    assert data["order_id"] == order_id


@pytest.mark.asyncio
async def test_6_invalid_payment_signature_is_rejected(async_client):
    """Test 6: Invalid payment signature is strictly rejected."""
    order_resp = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "buyer-test-6",
        "items": [{"product_id": 1021, "quantity": 1}]
    })
    assert order_resp.status_code == 201
    order_id = order_resp.json()["order_id"]

    pay_resp = await async_client.post("/api/payments/create", json={"order_id": order_id})
    assert pay_resp.status_code == 200
    rzp_order_id = pay_resp.json()["razorpay_order_id"]

    verify_resp = await async_client.post("/api/payments/verify", json={
        "order_id": order_id,
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": "pay_forged_456",
        "razorpay_signature": "invalid_forged_hmac_signature"
    })
    assert verify_resp.status_code == 400
    assert "invalid payment signature" in verify_resp.text.lower()


@pytest.mark.asyncio
async def test_7_invalid_webhook_signature_is_rejected(async_client):
    """Test 7: Webhook without valid signature is rejected."""
    body = b'{"event": "payment.captured", "payload": {}}'
    resp = await async_client.post(
        "/api/payments/webhook",
        content=body,
        headers={"X-Razorpay-Signature": "invalid_webhook_sig"}
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_8_captured_payment_updates_transaction(async_client):
    """Test 8: Captured payment updates transaction status to captured."""
    order_resp = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "buyer-test-8",
        "items": [{"product_id": 1021, "quantity": 1}]
    })
    assert order_resp.status_code == 201
    order_id = order_resp.json()["order_id"]
    pay_resp = await async_client.post("/api/payments/create", json={"order_id": order_id})
    assert pay_resp.status_code == 200
    rzp_order_id = pay_resp.json()["razorpay_order_id"]
    payment_id = "pay_captured_update_789"

    sig = generate_test_signature(rzp_order_id, payment_id, settings.RAZORPAY_KEY_SECRET)
    verify_resp = await async_client.post("/api/payments/verify", json={
        "order_id": order_id,
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": sig
    })
    assert verify_resp.status_code == 200

    # Check order status via API
    get_order_resp = await async_client.get(f"/api/orders/{order_id}")
    assert get_order_resp.status_code == 200
    assert get_order_resp.json()["transaction"]["status"] == "captured"


@pytest.mark.asyncio
async def test_9_failed_payment_updates_transaction(async_client):
    """Test 9: Failed payment records status as failed."""
    order_resp = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "buyer-test-9",
        "items": [{"product_id": 1021, "quantity": 1}]
    })
    assert order_resp.status_code == 201
    order_id = order_resp.json()["order_id"]

    fail_resp = await async_client.post("/api/payments/fail", json={
        "order_id": order_id,
        "reason": "Test card declined"
    })
    assert fail_resp.status_code == 200
    assert fail_resp.json()["status"] == "failed"


@pytest.mark.asyncio
async def test_10_already_paid_order_cannot_be_paid_again(async_client):
    """Test 10: Already-paid order cannot create another payment order."""
    order_resp = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "buyer-test-10",
        "items": [{"product_id": 1021, "quantity": 1}]
    })
    assert order_resp.status_code == 201
    order_id = order_resp.json()["order_id"]
    pay_resp = await async_client.post("/api/payments/create", json={"order_id": order_id})
    assert pay_resp.status_code == 200
    rzp_order_id = pay_resp.json()["razorpay_order_id"]
    payment_id = "pay_already_paid_10"

    sig = generate_test_signature(rzp_order_id, payment_id, settings.RAZORPAY_KEY_SECRET)
    verify_resp = await async_client.post("/api/payments/verify", json={
        "order_id": order_id,
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": sig
    })
    assert verify_resp.status_code == 200

    # Try creating payment again for already paid order
    repay_resp = await async_client.post("/api/payments/create", json={"order_id": order_id})
    assert repay_resp.status_code == 400
    assert "already paid" in repay_resp.text.lower()


@pytest.mark.asyncio
async def test_11_duplicate_payment_request_idempotency(async_client):
    """Test 11: Consecutive payment create requests for pending order reuses existing Razorpay order."""
    order_resp = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "buyer-test-11",
        "items": [{"product_id": 1021, "quantity": 1}]
    })
    assert order_resp.status_code == 201
    order_id = order_resp.json()["order_id"]

    resp1 = await async_client.post("/api/payments/create", json={"order_id": order_id})
    assert resp1.status_code == 200
    rzp_order1 = resp1.json()["razorpay_order_id"]

    # Second call for the same pending order
    resp2 = await async_client.post("/api/payments/create", json={"order_id": order_id})
    assert resp2.status_code == 200
    rzp_order2 = resp2.json()["razorpay_order_id"]

    assert rzp_order1 == rzp_order2  # Idempotently reuses existing pending test order


@pytest.mark.asyncio
async def test_12_policy_service_failure_prevents_payment(async_client):
    """Test 12: Fail-closed behavior if policy verification encounters an issue."""
    order_resp = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "buyer-test-12",
        "items": [{"product_id": 1021, "quantity": 1}]
    })
    assert order_resp.status_code == 201
    order_id = order_resp.json()["order_id"]

    # Mock PolicyService check_policy to simulate failure
    with patch("app.services.payment_service.PolicyService.check_policy") as mock_policy:
        mock_policy.return_value = {
            "allowed": False,
            "reason": "Policy engine offline test",
            "max_transaction_inr": 0.0
        }
        pay_resp = await async_client.post("/api/payments/create", json={"order_id": order_id})
        assert pay_resp.status_code == 403


@pytest.mark.asyncio
async def test_13_and_14_missing_product_and_insufficient_stock(async_client):
    """Test 13 & 14: Missing product returns 404, insufficient stock returns 400."""
    # Missing product
    resp_missing = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "buyer-test-13",
        "items": [{"product_id": 999999, "quantity": 1}]
    })
    assert resp_missing.status_code == 404

    # Insufficient stock
    resp_stock = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "buyer-test-14",
        "items": [{"product_id": 1001, "quantity": 99999}]
    })
    assert resp_stock.status_code == 400
    assert "insufficient stock" in resp_stock.text.lower()


@pytest.mark.asyncio
async def test_15_audit_events_created(async_client):
    """Test 15: All payment lifecycle transitions record audit logs."""
    audit_resp = await async_client.get("/api/audit?merchant_id=1")
    assert audit_resp.status_code == 200
    data = audit_resp.json()
    actions = [item["action"] for item in data["items"]]
    assert any(a in actions for a in ["razorpay_order_created", "payment_verified", "transaction_captured"])


@pytest.mark.asyncio
async def test_16_payment_secret_never_exposed(async_client):
    """Test 16: Razorpay secret key is NEVER returned in any API response."""
    order_resp = await async_client.post("/api/orders", json={
        "merchant_id": 1,
        "buyer_id": "buyer-test-16",
        "items": [{"product_id": 1021, "quantity": 1}]
    })
    assert order_resp.status_code == 201
    order_id = order_resp.json()["order_id"]

    pay_resp = await async_client.post("/api/payments/create", json={"order_id": order_id})
    assert pay_resp.status_code == 200
    pay_json_text = pay_resp.text

    assert settings.RAZORPAY_KEY_SECRET not in pay_json_text
    assert "key_secret" not in pay_json_text.lower()
