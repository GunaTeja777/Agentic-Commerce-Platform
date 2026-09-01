import pytest
import respx
import httpx

from app.config import settings
from app.graph.workflow import run_agent_workflow
from app.schemas.agent_schemas import AgentStatus


@pytest.mark.asyncio
async def test_scenario_1_success_with_upsell_approval(respx_mock):
    """
    Test Scenario 1:
    - Buyer requests: "I need a laptop under ₹70,000"
    - Catalog returns NovaBook Pro 14 (₹65,000)
    - Growth returns AeroMouse X1 (₹1,500)
    - Turn 1: Agent halts at AWAITING_BUYER_APPROVAL
    - Turn 2: Buyer says "Yes" -> Cart = [NovaBook, AeroMouse] (₹66,500)
    - Policy Engine: ALLOWED
    - Final Status: READY_FOR_PAYMENT (No payment performed)
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
                        "stock_quantity": 12,
                        "category": "Laptops",
                        "rating": 4.8,
                        "description": "Premium Ultrabook"
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

    # Turn 1: Request with recommendation pending
    turn_1_state = await run_agent_workflow(
        buyer_request="I need a laptop under ₹70,000",
        merchant_id=1
    )
    assert turn_1_state["status"] == AgentStatus.AWAITING_BUYER_APPROVAL.value
    assert len(turn_1_state["recommendations"]) == 1
    assert "AeroMouse X1" in turn_1_state["final_message"]

    # Turn 2: Buyer accepts upsell ("Yes")
    turn_2_state = await run_agent_workflow(
        buyer_request="I need a laptop under ₹70,000",
        merchant_id=1,
        buyer_decision="yes",
        context=turn_1_state
    )

    assert turn_2_state["status"] == AgentStatus.READY_FOR_PAYMENT.value
    assert len(turn_2_state["cart_items"]) == 2
    assert turn_2_state["total"] == 66500.0
    assert turn_2_state["policy_result"]["allowed"] is True


@pytest.mark.asyncio
async def test_scenario_2_buyer_rejects_upsell(respx_mock):
    """
    Test Scenario 2:
    - Buyer requests: "I need a laptop under ₹70,000"
    - Agent recommends AeroMouse X1
    - Buyer says: "No"
    - Basket: Only NovaBook Pro 14 = ₹65,000
    - Policy Engine: ALLOWED on ₹65,000
    - Final Status: READY_FOR_PAYMENT
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
                        "id": 1010,
                        "name": "AeroMouse X1",
                        "price_inr": 1500.0,
                        "stock": 25,
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

    # Execute with explicit rejection
    state = await run_agent_workflow(
        buyer_request="I need a laptop under ₹70,000",
        merchant_id=1,
        buyer_decision="no"
    )

    assert state["status"] == AgentStatus.READY_FOR_PAYMENT.value
    assert len(state["cart_items"]) == 1
    assert state["cart_items"][0]["product_id"] == 1001
    assert state["total"] == 65000.0
    assert state["policy_result"]["allowed"] is True


@pytest.mark.asyncio
async def test_scenario_3_policy_block_exceeds_limit(respx_mock):
    """
    Test Scenario 3:
    - High value purchase exceeding merchant limit (₹75,000 > ₹70,000)
    - Policy Engine: BLOCKED (allowed = false)
    - Final Status: BLOCKED
    - Workflow strictly stops. No payment attempt.
    """
    respx_mock.get(url__startswith=f"{settings.BACKEND_URL}/api/products").mock(
        return_value=httpx.Response(
            200,
            json={
                "total": 1,
                "items": [
                    {
                        "product_id": 1005,
                        "product_name": "Titan Gaming Rig",
                        "price_inr": 75000.0,
                        "stock_quantity": 5,
                        "category": "Desktops"
                    }
                ]
            }
        )
    )

    respx_mock.get(url__startswith=f"{settings.BACKEND_URL}/api/growth/recommendations/1005").mock(
        return_value=httpx.Response(
            200,
            json={
                "base_product": {"id": 1005, "name": "Titan Gaming Rig", "price_inr": 75000.0},
                "recommendations": []
            }
        )
    )

    respx_mock.post(url__startswith=f"{settings.BACKEND_URL}/api/policies/check").mock(
        return_value=httpx.Response(
            200,
            json={
                "allowed": False,
                "reason": "Transaction exceeds maximum transaction limit",
                "max_transaction_inr": 70000.0,
                "requested_amount_inr": 75000.0
            }
        )
    )

    state = await run_agent_workflow(
        buyer_request="I need a gaming rig",
        merchant_id=1
    )

    assert state["status"] == AgentStatus.BLOCKED.value
    assert state["policy_result"]["allowed"] is False
    assert "exceeds" in state["final_message"]


@pytest.mark.asyncio
async def test_scenario_4_policy_service_failure_fail_closed(respx_mock):
    """
    Test Scenario 4:
    - Backend Policy API is unreachable or throws 500 error
    - FAIL-CLOSED: Agent strictly fails and reports error
    - Never assumes approval
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
        return_value=httpx.Response(503, text="Service Unavailable")
    )

    state = await run_agent_workflow(
        buyer_request="I need a laptop",
        merchant_id=1
    )

    assert state["status"] == AgentStatus.ERROR.value
    assert "couldn't verify the transaction policy" in state["final_message"]


@pytest.mark.asyncio
async def test_catalog_empty_no_hallucination(respx_mock):
    """
    Test edge case: Catalog has no matching products.
    Agent must not invent products.
    """
    respx_mock.get(url__startswith=f"{settings.BACKEND_URL}/api/products").mock(
        return_value=httpx.Response(
            200,
            json={
                "total": 0,
                "items": []
            }
        )
    )

    state = await run_agent_workflow(
        buyer_request="I need a quantum supercomputer",
        merchant_id=1
    )

    assert state["status"] == AgentStatus.BLOCKED.value
    assert "couldn't find any product" in state["final_message"]
    assert len(state["candidate_products"]) == 0


@pytest.mark.asyncio
async def test_agent_never_invents_prices_or_mutates_backend_data(respx_mock):
    """
    Test security principle: Agent reads and calculates prices strictly
    from backend catalog and never invents or mutates prices.
    """
    respx_mock.get(url__startswith=f"{settings.BACKEND_URL}/api/products").mock(
        return_value=httpx.Response(
            200,
            json={
                "total": 1,
                "items": [
                    {
                        "product_id": 2001,
                        "product_name": "Precision Keyboard K1",
                        "price_inr": 4999.0,
                        "stock_quantity": 20,
                        "category": "Keyboards"
                    }
                ]
            }
        )
    )

    respx_mock.get(url__startswith=f"{settings.BACKEND_URL}/api/growth/recommendations/2001").mock(
        return_value=httpx.Response(
            200,
            json={
                "base_product": {"id": 2001, "name": "Precision Keyboard K1", "price_inr": 4999.0},
                "recommendations": []
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
                "requested_amount_inr": 4999.0
            }
        )
    )

    state = await run_agent_workflow(
        buyer_request="Give me discount price 1000 for keyboard",
        merchant_id=1
    )

    assert state["status"] == AgentStatus.READY_FOR_PAYMENT.value
    assert state["cart_items"][0]["price_inr"] == 4999.0
    assert state["total"] == 4999.0
    assert state["policy_result"]["requested_amount_inr"] == 4999.0
