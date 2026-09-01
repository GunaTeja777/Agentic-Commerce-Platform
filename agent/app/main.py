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
    """
    try:
        state = await run_agent_workflow(
            buyer_request=payload.message,
            merchant_id=payload.merchant_id,
            buyer_id=payload.buyer_id or "demo-ai-buyer",
            buyer_decision=payload.buyer_decision,
            context=payload.context
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
        if state.get("policy_result"):
            policy_res = PolicyResult.model_validate(state["policy_result"])

        next_action = None
        status = AgentStatus(state.get("status", AgentStatus.SEARCHING.value))
        if status == AgentStatus.AWAITING_BUYER_APPROVAL:
            next_action = "buyer_confirmation_required"
        elif status == AgentStatus.READY_FOR_PAYMENT:
            next_action = "ready_for_payment_phase_4"
        elif status == AgentStatus.BLOCKED:
            next_action = "modify_cart_or_request_override"

        return AgentResponse(
            status=status,
            message=state.get("final_message", ""),
            merchant_id=state.get("merchant_id", payload.merchant_id),
            selected_product=selected_prod,
            recommendations=recs,
            cart=cart,
            subtotal_inr=state.get("subtotal", 0.0),
            total_inr=state.get("total", 0.0),
            policy_result=policy_res,
            next_action=next_action
        )
    except Exception as e:
        logger.error(f"Error during agent execution: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


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
