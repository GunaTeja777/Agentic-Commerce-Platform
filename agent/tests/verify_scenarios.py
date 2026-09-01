import sys
import asyncio
import httpx
import respx

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.config import settings
from app.graph.workflow import run_agent_workflow
from app.schemas.agent_schemas import AgentStatus


async def run_scenario_1():
    print("\n" + "=" * 70)
    print(" 🚀 RUNNING TEST SCENARIO 1: SUCCESS (BUYER APPROVES UPSELL)")
    print("=" * 70)
    
    with respx.mock(assert_all_called=False) as respx_mock:
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
                            "description": "High performance laptop"
                        }
                    ]
                }
            )
        )

        # 2. Mock Growth Recommendation
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

        # 3. Mock Policy Check
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

        print("[Buyer Request]: 'I need a laptop under ₹70,000.'")
        turn_1 = await run_agent_workflow(
            buyer_request="I need a laptop under 70000",
            merchant_id=1
        )
        print(f"Catalog Found: {turn_1['selected_product']['product_name']} (₹{turn_1['selected_product']['price_inr']:,.2f})")
        print(f"Growth Upsell Offered: {turn_1['recommendations'][0]['name']} (₹{turn_1['recommendations'][0]['price_inr']:,.2f})")
        print(f"Agent Status (Turn 1): {turn_1['status']}")
        print(f"Agent Message:\n{turn_1['final_message']}")

        print("\n[Buyer Decision]: 'Yes, add it.'")
        turn_2 = await run_agent_workflow(
            buyer_request="I need a laptop under 70000",
            merchant_id=1,
            buyer_decision="yes",
            context=turn_1
        )

        print(f"\n🛒 Basket Items ({len(turn_2['cart_items'])}):")
        for item in turn_2['cart_items']:
            tag = " (Upsell)" if item.get('is_upsell') else ""
            print(f"  - {item['product_name']}{tag}: ₹{item['price_inr']:,.2f}")
        print(f"Total Basket Amount: ₹{turn_2['total']:,.2f}")
        print(f"🛡️ Policy Check: Allowed={turn_2['policy_result']['allowed']} | Reason: {turn_2['policy_result']['reason']}")
        print(f"Agent Final Status: {turn_2['status']}")
        print(f"Final Message:\n{turn_2['final_message']}")
        assert turn_2["status"] == AgentStatus.READY_FOR_PAYMENT.value
        assert turn_2["total"] == 66500.0
        print("✅ SCENARIO 1 RESULT: Ready for payment, ₹66,500, NO payment called.")


async def run_scenario_2():
    print("\n" + "=" * 70)
    print(" 🚀 RUNNING TEST SCENARIO 2: BUYER REJECTS UPSELL")
    print("=" * 70)
    
    with respx.mock(assert_all_called=False) as respx_mock:
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

        print("[Buyer Request]: 'I need a laptop under ₹70,000.'")
        print("[Buyer Decision]: 'No.' (Rejects AeroMouse X1 upsell)")

        state = await run_agent_workflow(
            buyer_request="I need a laptop under 70000",
            merchant_id=1,
            buyer_decision="no"
        )

        print(f"\n🛒 Basket Items ({len(state['cart_items'])}):")
        for item in state['cart_items']:
            print(f"  - {item['product_name']}: ₹{item['price_inr']:,.2f}")
        print(f"Total Basket Amount: ₹{state['total']:,.2f}")
        print(f"🛡️ Policy Check: Allowed={state['policy_result']['allowed']} | Reason: {state['policy_result']['reason']}")
        print(f"Agent Final Status: {state['status']}")
        print(f"Final Message:\n{state['final_message']}")
        assert state["status"] == AgentStatus.READY_FOR_PAYMENT.value
        assert state["total"] == 65000.0
        print("✅ SCENARIO 2 RESULT: Base laptop only (₹65,000) ready for payment.")


async def run_scenario_3():
    print("\n" + "=" * 70)
    print(" 🚀 RUNNING TEST SCENARIO 3: POLICY BLOCK (AMOUNT EXCEEDS LIMIT)")
    print("=" * 70)
    
    with respx.mock(assert_all_called=False) as respx_mock:
        # Base product: ₹65,000 + Growth Recommendations: Bag ₹2,000 + Monitor ₹12,000 = ₹79,000
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
                        {"id": 1020, "name": "Laptop Bag", "price_inr": 2000.0, "stock": 15, "reason": "Protective bag"},
                        {"id": 1030, "name": "UltraHD 4K Monitor", "price_inr": 12000.0, "stock": 8, "reason": "External display"}
                    ]
                }
            )
        )

        # Policy response returns blocked
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

        print("[Buyer Request]: 'I need a laptop with accessories'")
        print("[Buyer Decision]: 'Yes, add all accessories' (Total ₹79,000 > Policy Limit ₹70,000)")

        state = await run_agent_workflow(
            buyer_request="I need a laptop with accessories",
            merchant_id=1,
            buyer_decision="yes"
        )

        print(f"\n🛒 Basket Items ({len(state['cart_items'])}):")
        for item in state['cart_items']:
            print(f"  - {item['product_name']}: ₹{item['price_inr']:,.2f}")
        print(f"Total Basket Total: ₹{state['total']:,.2f}")
        print(f"🛡️ Policy Engine Output: Allowed={state['policy_result']['allowed']} | Reason: {state['policy_result']['reason']}")
        print(f"Agent Final Status: {state['status']}")
        print(f"Agent Final Message:\n{state['final_message']}")
        assert state["status"] == AgentStatus.BLOCKED.value
        assert state["policy_result"]["allowed"] is False
        print("✅ SCENARIO 3 RESULT: Policy Engine blocked transaction. Workflow halted. NO payment attempt.")


async def run_scenario_4():
    print("\n" + "=" * 70)
    print(" 🚀 RUNNING TEST SCENARIO 4: POLICY SERVICE FAILURE (FAIL-CLOSED)")
    print("=" * 70)
    
    with respx.mock(assert_all_called=False) as respx_mock:
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

        # Simulate 503 Policy Service Downtime
        respx_mock.post(url__startswith=f"{settings.BACKEND_URL}/api/policies/check").mock(
            return_value=httpx.Response(503, text="Service Unavailable")
        )

        print("[Buyer Request]: 'I need a laptop'")
        print("[Simulating]: Policy Engine API is DOWN (HTTP 503)...")

        state = await run_agent_workflow(
            buyer_request="I need a laptop",
            merchant_id=1
        )

        print(f"\nAgent Final Status: {state['status']}")
        print(f"Agent Final Message:\n{state['final_message']}")
        assert state["status"] == AgentStatus.ERROR.value
        print("✅ SCENARIO 4 RESULT: Policy failure resulted in FAIL-CLOSED error. Workflow halted immediately.")


async def main():
    print("\n" + "#" * 70)
    print("   AGENTIC COMMERCE PHASE 3 — 4 CORE SCENARIO VERIFICATION")
    print("#" * 70)
    await run_scenario_1()
    await run_scenario_2()
    await run_scenario_3()
    await run_scenario_4()
    print("\n" + "#" * 70)
    print("   🎉 ALL 4 CORE SCENARIOS VERIFIED & WORKING 100% PERFECTLY!")
    print("#" * 70 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
