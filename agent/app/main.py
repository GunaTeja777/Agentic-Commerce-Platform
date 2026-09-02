import sys
import asyncio
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.config import settings
from app.schemas.agent_schemas import (
    AgentChatRequest,
    AgentResponse,
    AgentStatus,
    ProductResult,
    GrowthRecommendationItem,
    CartItem,
    PolicyResult,
    StructuredPolicyResponse,
)
from app.graph.workflow import run_agent_workflow
from app.services.backend_client import backend_client

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("agent.main")

# FastAPI App
app = FastAPI(
    title="Agentic Commerce — AI Merchant Growth Agent",
    version="1.0.0",
    description="LangGraph AI Merchant Growth Agent orchestrating Catalog, Growth, and Policy Tools",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", summary="Agent Service Health Check")
async def health():
    return {
        "status": "healthy",
        "service": "agentic-growth-agent",
        "backend_url": settings.BACKEND_URL,
    }


@app.post("/agent/chat", response_model=AgentResponse, summary="Chat with Merchant AI Growth Agent")
async def chat_agent(payload: AgentChatRequest):
    """
    Primary endpoint for AI Buyer to interact with Merchant AI Agent.
    Orchestrates search, data-backed upsells, buyer approval gating, and deterministic policy checks.
    Supports both freeform natural language and structured A2A JSON payloads.
    """
    try:
        msg = payload.message
        buyer_id = payload.buyer_id or "demo-ai-buyer"
        req_id = payload.request_id

        if payload.structured_request:
            sr = payload.structured_request
            buyer_id = sr.buyer_id or buyer_id
            req_id = sr.request_id or req_id
            if not msg:
                msg = f"I need a {sr.category} with budget {sr.budget_inr} INR for {sr.preferences.use_case if sr.preferences else 'work'}"

        state = await run_agent_workflow(
            buyer_request=msg or "I need a laptop for work under ₹70,000.",
            merchant_id=payload.merchant_id,
            buyer_id=buyer_id,
            buyer_decision=payload.buyer_decision,
            context=payload.context,
            request_id=req_id,
            structured_request=payload.structured_request.model_dump() if payload.structured_request else None
        )

        selected_prod = None
        if state.get("selected_product"):
            selected_prod = ProductResult.model_validate(state["selected_product"])

        recs = [
            GrowthRecommendationItem.model_validate(r)
            for r in state.get("recommendations", [])
        ]

        cart = [
            CartItem.model_validate(item)
            for item in state.get("cart_items", [])
        ]

        policy_res = None
        structured_policy = None
        if state.get("policy_result"):
            policy_res = PolicyResult.model_validate(state["policy_result"])
            structured_policy = StructuredPolicyResponse(
                allowed=policy_res.allowed,
                limit_inr=policy_res.max_transaction_inr,
                reason=policy_res.reason
            )

        next_action = None
        status = AgentStatus(state.get("status", AgentStatus.SEARCHING.value))
        if status == AgentStatus.AWAITING_BUYER_APPROVAL:
            next_action = "buyer_confirmation_required"
        elif status == AgentStatus.READY_FOR_PAYMENT:
            next_action = "ready_for_razorpay_checkout"
        elif status == AgentStatus.BLOCKED:
            next_action = "blocked_by_policy"

        return AgentResponse(
            status=status,
            message=state.get("final_message", ""),
            merchant_id=state.get("merchant_id", payload.merchant_id),
            selected_product=selected_prod,
            recommendations=recs,
            cart=cart,
            items=cart,
            subtotal_inr=state.get("subtotal", 0.0),
            total_inr=state.get("total", 0.0),
            policy_result=policy_res,
            policy=structured_policy,
            order_id=state.get("order_id"),
            payment_info=state.get("payment_info"),
            next_action=next_action,
            request_id=state.get("request_id", req_id)
        )
    except Exception as e:
        logger.error(f"Error during agent execution: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error_code": "AGENT_EXECUTION_ERROR", "detail": str(e)}
        )


async def run_cli_demo():
    """
    Interactive Terminal CLI Demo for testing the LangGraph Agent workflows.
    """
    print("=" * 65)
    print(" 🤖 AGENTIC COMMERCE — AI MERCHANT GROWTH AGENT (CLI DEMO)")
    print("=" * 65)
    print(f" Connected Backend: {settings.BACKEND_URL}")
    print(" (Type 'exit' or 'quit' to stop)\n")

    merchant_id = settings.DEFAULT_MERCHANT_ID

    while True:
        try:
            user_input = input("\n[Buyer Prompt] > ").strip()
            if not user_input or user_input.lower() in ["exit", "quit"]:
                print("\nExiting CLI demo. Goodbye!")
                break

            print("\n🔄 Agent thinking and orchestrating tools...")
            state = await run_agent_workflow(
                buyer_request=user_input,
                merchant_id=merchant_id
            )

            status = state.get("status")
            print(f"\n[Agent Status]: {status.upper()}")
            print(f"[Message]:\n{state.get('final_message')}")

            # If awaiting buyer decision on recommendations
            if status == AgentStatus.AWAITING_BUYER_APPROVAL.value:
                choice = input("\n[Buyer Decision (Yes/No)] > ").strip().lower()
                decision = "yes" if choice in ["yes", "y", "sure", "add"] else "no"
                
                print(f"\n🔄 Resuming workflow with decision: '{decision}'...")
                resumed_state = await run_agent_workflow(
                    buyer_request=user_input,
                    merchant_id=merchant_id,
                    buyer_decision=decision,
                    context=state
                )
                
                print(f"\n[Agent Final Status]: {resumed_state.get('status').upper()}")
                print(f"[Message]:\n{resumed_state.get('final_message')}")
                if resumed_state.get("cart_items"):
                    print("\n🛒 [Final Cart Items]:")
                    for item in resumed_state["cart_items"]:
                        upsell_tag = " (Upsell)" if item.get("is_upsell") else ""
                        print(f"  - {item['product_name']}{upsell_tag}: ₹{item['price_inr']:,.2f} x {item['quantity']}")
                    print(f"  Total: ₹{resumed_state.get('total', 0.0):,.2f}")

                if resumed_state.get("policy_result"):
                    p = resumed_state["policy_result"]
                    print(f"\n🛡️ [Policy Engine Result]: Allowed={p.get('allowed')} | Reason: {p.get('reason')}")

        except (KeyboardInterrupt, EOFError):
            print("\nSession ended.")
            break
        except Exception as e:
            print(f"\n❌ Error during execution: {e}")


def main():
    if "--cli" in sys.argv or sys.argv[0].endswith("main.py"):
        asyncio.run(run_cli_demo())
    else:
        uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)


if __name__ == "__main__":
    main()
