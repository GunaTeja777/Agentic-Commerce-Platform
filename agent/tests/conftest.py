import pytest
import respx
import httpx
from app.config import settings


@pytest.fixture(autouse=True)
def default_backend_mocks(respx_mock):
    """
    Default mock endpoints for backend orders and payments
    so all agent workflow tests automatically succeed at payment stage when policy allows.
    """
    respx_mock.post(url__startswith=f"{settings.BACKEND_URL}/api/orders").mock(
        return_value=httpx.Response(
            201,
            json={
                "order_id": 999,
                "merchant_id": 1,
                "buyer_id": "demo-ai-buyer",
                "subtotal_inr": 66500.0,
                "total_inr": 66500.0,
                "status": "created",
                "policy_allowed": True,
                "policy_reason": "Allowed by merchant policy",
                "items": []
            }
        )
    )

    respx_mock.post(url__startswith=f"{settings.BACKEND_URL}/api/payments/create").mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "order_id": 999,
                "razorpay_order_id": "order_test_999_xyz",
                "amount": 6650000,
                "amount_inr": 66500.0,
                "currency": "INR",
                "key_id": "rzp_test_mock_sample_key",
                "status": "pending",
                "receipt": "rcpt_ord_999"
            }
        )
    )

    yield respx_mock
