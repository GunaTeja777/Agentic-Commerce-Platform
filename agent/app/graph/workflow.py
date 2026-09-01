import logging
from typing import Dict, Any, Optional, Literal
from langgraph.graph import StateGraph, START, END

from app.graph.state import AgentState
from app.schemas.agent_schemas import AgentStatus
from app.graph.nodes import (
    understand_request_node,
    catalog_search_node,
    select_product_node,
    growth_recommendation_node,
    build_basket_node,
    policy_check_node,
)

logger = logging.getLogger("agent.graph.workflow")


def route_after_catalog_search(state: AgentState) -> Literal["select_product", "__end__"]:
    """Route after searching catalog. Stop if no products found."""
    if state.get("status") == AgentStatus.BLOCKED.value or not state.get("candidate_products"):
        return END
    return "select_product"


def route_after_growth(state: AgentState) -> Literal["build_basket", "__end__"]:
    """Route after growth recommendation. Stop to await buyer decision if upsell is proposed."""
    if state.get("status") == AgentStatus.AWAITING_BUYER_APPROVAL.value:
        return END
    return "build_basket"


def create_agent_graph() -> StateGraph:
    """
    Constructs the LangGraph workflow for the Agentic Commerce Merchant Growth Agent.
    """
    workflow = StateGraph(AgentState)

    # Register Nodes
    workflow.add_node("understand_request", understand_request_node)
    workflow.add_node("catalog_search", catalog_search_node)
    workflow.add_node("select_product", select_product_node)
    workflow.add_node("growth_recommendation", growth_recommendation_node)
    workflow.add_node("build_basket", build_basket_node)
    workflow.add_node("policy_check", policy_check_node)

    # Edge Connections
    workflow.add_edge(START, "understand_request")
    workflow.add_edge("understand_request", "catalog_search")
    workflow.add_conditional_edges(
        "catalog_search",
        route_after_catalog_search,
        {
            "select_product": "select_product",
            END: END
        }
    )
    workflow.add_edge("select_product", "growth_recommendation")
    workflow.add_conditional_edges(
        "growth_recommendation",
        route_after_growth,
        {
            "build_basket": "build_basket",
            END: END
        }
    )
    workflow.add_edge("build_basket", "policy_check")
    workflow.add_edge("policy_check", END)

    return workflow


# Compiled Workflow Instance
agent_graph = create_agent_graph().compile()


async def run_agent_workflow(
    buyer_request: str,
    merchant_id: int = 1,
    buyer_id: str = "demo-ai-buyer",
    buyer_decision: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None
) -> AgentState:
    """
    Convenience function to run or resume the LangGraph workflow.
    Supports multi-turn interactive loops and buyer gating.
    """
    initial_state: AgentState = {
        "buyer_request": buyer_request,
        "merchant_id": merchant_id,
        "buyer_id": buyer_id,
        "buyer_decision": buyer_decision,
        "candidate_products": [],
        "recommendations": [],
        "cart_items": [],
        "subtotal": 0.0,
        "total": 0.0,
        "status": AgentStatus.SEARCHING.value,
        "current_step": "init",
        "final_message": "",
        "conversation_messages": [],
        "audit_context": {}
    }

    if context:
        for k, v in context.items():
            initial_state[k] = v

    # Explicit arguments override context
    if buyer_decision is not None:
        initial_state["buyer_decision"] = buyer_decision
    if buyer_request:
        initial_state["buyer_request"] = buyer_request
    if merchant_id:
        initial_state["merchant_id"] = merchant_id

    final_state = await agent_graph.ainvoke(initial_state)
    return final_state
