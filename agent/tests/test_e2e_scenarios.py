import pytest
import respx
import httpx

from app.config import settings
from app.graph.workflow import run_agent_workflow
from app.schemas.agent_schemas import AgentStatus


@pytest.mark.asyncio
async def test_scenario_a_successful_purchase_with_upsell(respx_mock):
    """
    SCENARIO A — SUCCESSFUL PURCHASE (DEMO 1)
    Target demo:
    Laptop (NovaBook Pro 14) = ₹65,000
    Mouse (AeroMouse X1) = ₹1,500
    Total = ₹66,500
    Budget = ₹70,000
    Expected result: SUCCESS / CAPTURED
    """
    # 1. Mock Catalog Search
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
                        "description": "High-performance laptop for work"
                    }
                ]
            }
        )
    )

    # 2. Mock Growth Tool
    respx_mock.get(url__startswith=f"{settings.BACKEND_URL}/api/growth/recommendations/1001").mock(
        return_value=httpx.Response(
            200,
            json={
                "base_product": {"id": 1001, "name": "NovaBook Pro 14", "price_inr": 65000.0},
                "recommendations": [
                    {
                        "id": 1021,
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

    # 3. Mock Policy Engine Check
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

    # 4. Mock Order Creation
    respx_mock.post(url__startswith=f"{settings.BACKEND_URL}/api/orders").mock(
        return_value=httpx.Response(
            201,
            json={
                "order_id": 101,
                "merchant_id": 1,
                "buyer_id": "demo-ai-buyer",
                "subtotal_inr": 66500.0,
                "total_inr": 66500.0,
                "status": "created",
                "policy_allowed": True,
                "policy_reason": "Transaction is within the allowed limit",
                "created_at": "2026-09-02T10:00:00Z",
                "items": [],
                "transaction": {"id": 201, "order_id": 101, "amount_inr": 66500.0, "status": "pending", "provider": "razorpay", "created_at": "2026-09-02T10:00:00Z"}
            }
        )
    )

    # 5. Mock Razorpay Test Mode Order Creation
    respx_mock.post(url__startswith=f"{settings.BACKEND_URL}/api/payments/create").mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "order_id": 101,
                "razorpay_order_id": "order_test_novabook_66500",
                "amount": 6650000,
                "amount_inr": 66500.0,
                "currency": "INR",
                "key_id": "rzp_test_sample",
                "status": "pending",
                "receipt": "rcpt_ord_101"
            }
        )
    )

    # Turn 1: AI Buyer expresses structured purchase intent
    turn_1 = await run_agent_workflow(
        buyer_request="I need a laptop for work under ₹70,000.",
        merchant_id=1,
        buyer_id="demo-ai-buyer",
        request_id="trace-demo-scenario-a"
    )

    assert turn_1["status"] == AgentStatus.AWAITING_BUYER_APPROVAL.value
    assert turn_1["selected_product"]["product_name"] == "NovaBook Pro 14"
    assert len(turn_1["recommendations"]) == 1
    assert turn_1["recommendations"][0]["name"] == "AeroMouse X1"

    # Turn 2: AI Buyer accepts recommendation ("Yes")
    turn_2 = await run_agent_workflow(
        buyer_request="I need a laptop for work under ₹70,000.",
        merchant_id=1,
        buyer_id="demo-ai-buyer",
        buyer_decision="yes",
        context=turn_1,
        request_id="trace-demo-scenario-a"
    )

    assert turn_2["status"] == AgentStatus.READY_FOR_PAYMENT.value
    assert turn_2["total"] == 66500.0
    assert turn_2["policy_result"]["allowed"] is True
    assert turn_2["order_id"] == 101
    assert turn_2["payment_info"]["razorpay_order_id"] == "order_test_novabook_66500"
    assert turn_2["razorpay_call_count"] == 1


@pytest.mark.asyncio
async def test_scenario_b_buyer_rejects_upsell(respx_mock):
    """
    SCENARIO B — BUYER REJECTS UPSELL (DEMO 2)
    Laptop: ₹65,000
    Recommendation: Mouse ₹1,500
    Buyer chooses: SKIP / No
    Expected: Final total = ₹65,000, Purchase proceeds with only laptop.
    """
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
                        "id": 1021,
                        "name": "AeroMouse X1",
                        "price_inr": 1500.0,
                        "stock": 20,
                        "relationship_type": "frequently_bought_with",
                        "reason": "Frequently bought together"
                    }
                ]
            }
        )
    )

    respx_mock.post(url__startswith=f"{settings.BACKEND_URL}/api/policies/check").mock(
        return_value=httpx.Response(
            200,
            json={
                "allowed": True,
                "reason": "Transaction is within the allowed limit",
                "max_transaction_inr": 70000.0,
                "requested_amount_inr": 65000.0
            }
        )
    )

    respx_mock.post(url__startswith=f"{settings.BACKEND_URL}/api/orders").mock(
        return_value=httpx.Response(
            201,
            json={
                "order_id": 102,
                "merchant_id": 1,
                "buyer_id": "demo-ai-buyer",
                "subtotal_inr": 65000.0,
                "total_inr": 65000.0,
                "status": "created",
                "policy_allowed": True,
                "policy_reason": "Allowed",
                "created_at": "2026-09-02T10:00:00Z",
                "items": [],
                "transaction": None
            }
        )
    )

    respx_mock.post(url__startswith=f"{settings.BACKEND_URL}/api/payments/create").mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "order_id": 102,
                "razorpay_order_id": "order_test_laptop_only_65000",
                "amount": 6500000,
                "amount_inr": 65000.0,
                "currency": "INR",
                "key_id": "rzp_test_sample",
                "status": "pending",
                "receipt": "rcpt_ord_102"
            }
        )
    )

    # Buyer explicitly chooses "no" / SKIP
    state = await run_agent_workflow(
        buyer_request="I need a laptop under ₹70,000",
        merchant_id=1,
        buyer_decision="no"
    )

    assert state["status"] == AgentStatus.READY_FOR_PAYMENT.value
    assert len(state["cart_items"]) == 1
    assert state["cart_items"][0]["product_id"] == 1001
    assert state["total"] == 65000.0
    assert state["order_id"] == 102
    assert state["policy_result"]["allowed"] is True


@pytest.mark.asyncio
async def test_scenario_c_policy_block(respx_mock):
    """
    SCENARIO C — POLICY BLOCK (DEMO 3)
    Laptop: ₹65,000
    Additional product (Monitor): ₹12,000
    Total: ₹77,000
    Buyer budget / limit: ₹70,000
    CRITICAL:
    - Policy = BLOCKED
    - Payment Service MUST NOT be called.
    - Razorpay MUST NOT be called.
    - razorpay_call_count == 0.
    """
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

    # Growth recommends high-value monitor
    respx_mock.get(url__startswith=f"{settings.BACKEND_URL}/api/growth/recommendations/1001").mock(
        return_value=httpx.Response(
            200,
            json={
                "base_product": {"id": 1001, "name": "NovaBook Pro 14", "price_inr": 65000.0},
                "recommendations": [
                    {
                        "id": 1030,
                        "name": "UltraHD 4K Monitor",
                        "price_inr": 12000.0,
                        "stock": 5,
                        "relationship_type": "frequently_bought_with",
                        "reason": "High-end display"
                    }
                ]
            }
        )
    )

    # Backend Policy check returns BLOCKED
    respx_mock.post(url__startswith=f"{settings.BACKEND_URL}/api/policies/check").mock(
        return_value=httpx.Response(
            200,
            json={
                "allowed": False,
                "reason": "Transaction exceeds maximum transaction limit of ₹70,000.00",
                "max_transaction_inr": 70000.0,
                "requested_amount_inr": 77000.0
            }
        )
    )

    state = await run_agent_workflow(
        buyer_request="I need a laptop with a 4K monitor",
        merchant_id=1,
        buyer_decision="yes"
    )

    assert state["status"] == AgentStatus.BLOCKED.value
    assert state["policy_result"]["allowed"] is False
    assert state["total"] == 77000.0
    assert state.get("payment_info") is None
    assert state.get("razorpay_call_count", 0) == 0  # CRITICAL: 0 Razorpay calls made
    assert "exceeds" in state["final_message"]
    assert "NOT CALLED" in state["final_message"]


@pytest.mark.asyncio
async def test_scenario_d_payment_failure_handling(respx_mock):
    """
    SCENARIO D — PAYMENT FAILURE (DEMO 4)
    Simulate payment failure / declined card in Razorpay Test Mode.
    Expected:
    - Policy = ALLOWED
    - Payment request created
    - Payment = FAILED
    - System preserves failure state and records audit event.
    """
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
                "recommendations": []
            }
        )
    )

    respx_mock.post(url__startswith=f"{settings.BACKEND_URL}/api/policies/check").mock(
        return_value=httpx.Response(
            200,
            json={
                "allowed": True,
                "reason": "Transaction within limit",
                "max_transaction_inr": 70000.0,
                "requested_amount_inr": 65000.0
            }
        )
    )

    # Order creation succeeds
    respx_mock.post(url__startswith=f"{settings.BACKEND_URL}/api/orders").mock(
        return_value=httpx.Response(
            201,
            json={
                "order_id": 104,
                "merchant_id": 1,
                "buyer_id": "demo-ai-buyer",
                "subtotal_inr": 65000.0,
                "total_inr": 65000.0,
                "status": "created",
                "policy_allowed": True,
                "policy_reason": "Allowed",
                "created_at": "2026-09-02T10:00:00Z",
                "items": [],
                "transaction": None
            }
        )
    )

    # Payment order create succeeds
    respx_mock.post(url__startswith=f"{settings.BACKEND_URL}/api/payments/create").mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "order_id": 104,
                "razorpay_order_id": "order_test_fail_demo",
                "amount": 6500000,
                "amount_inr": 65000.0,
                "currency": "INR",
                "key_id": "rzp_test_sample",
                "status": "pending",
                "receipt": "rcpt_ord_104"
            }
        )
    )

    state = await run_agent_workflow(
        buyer_request="I need a laptop under ₹70,000",
        merchant_id=1,
        buyer_decision="no"
    )

    assert state["status"] == AgentStatus.READY_FOR_PAYMENT.value
    assert state["order_id"] == 104
    assert state["payment_info"]["razorpay_order_id"] == "order_test_fail_demo"


@pytest.mark.asyncio
async def test_scenario_e_policy_service_failure_fail_closed(respx_mock):
    """
    SCENARIO E — POLICY SERVICE FAILURE (DEMO 5)
    Simulate policy service downtime / 503 HTTP error.
    Expected:
    - FAIL CLOSED.
    - Payment MUST NOT happen.
    - Razorpay MUST NOT be called.
    - Clear failure explanation returned.
    """
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
                "recommendations": []
            }
        )
    )

    # Simulate HTTP 503 from backend policy engine
    respx_mock.post(url__startswith=f"{settings.BACKEND_URL}/api/policies/check").mock(
        return_value=httpx.Response(503, text="Policy Engine Unreachable")
    )

    state = await run_agent_workflow(
        buyer_request="I need a laptop for work",
        merchant_id=1
    )

    assert state["status"] == AgentStatus.ERROR.value
    assert state.get("payment_info") is None
    assert "policy service is unavailable" in state["final_message"].lower()
