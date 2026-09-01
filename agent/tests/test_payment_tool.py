import pytest
import httpx
import respx
from app.config import settings
from app.tools.payment_tool import execute_payment_initiation, payment_tool


@pytest.mark.asyncio
async def test_payment_tool_blocked_when_policy_false():
    """Policy Gate Check: Payment tool refuses execution when policy_allowed=False."""
    result = await execute_payment_initiation(
        merchant_id=1,
        order_id=123,
        policy_allowed=False
    )
    assert result["status"] == "blocked"
    assert result["payment_attempted"] is False
    assert "blocked by merchant policy gate" in result["reason"]


@pytest.mark.asyncio
async def test_payment_tool_executes_when_policy_true(respx_mock):
    """Payment Tool creates Razorpay test order when policy_allowed=True."""
    respx_mock.post(f"{settings.BACKEND_URL}/api/payments/create").mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "order_id": 123,
                "razorpay_order_id": "order_RZP123TEST",
                "amount": 6650000,
                "amount_inr": 66500.0,
                "currency": "INR",
                "key_id": "rzp_test_TWfbZX7sZugjLd",
                "status": "pending",
                "receipt": "rcpt_ord_123"
            }
        )
    )

    result = await execute_payment_initiation(
        merchant_id=1,
        order_id=123,
        policy_allowed=True
    )
    assert result["status"] == "ready_for_checkout"
    assert result["payment_attempted"] is True
    assert result["razorpay_order_id"].startswith("order_")
    assert result["amount_inr"] == 66500.0
