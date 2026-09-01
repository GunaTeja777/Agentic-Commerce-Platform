import re
import json
import logging
from typing import Dict, Any, Optional, List

from app.config import settings
from app.graph.state import AgentState
from app.schemas.agent_schemas import AgentStatus
from app.tools.catalog_tool import execute_catalog_search
from app.tools.growth_tool import execute_growth_recommendation
from app.tools.policy_tool import execute_policy_check

logger = logging.getLogger("agent.graph.nodes")


def parse_intent_fallback(text: str) -> Dict[str, Any]:
    """
    Robust rule-based parser for budget and product keywords
    when LLM is not configured or in unit test mode.
    """
    text_lower = text.lower()
    
    # Extract budget if mentioned (e.g. under 70000, under ₹70,000, budget 65000, 70k)
    budget = None
    budget_patterns = [
        r'(?:under|below|max|budget|within|upto|up\s+to)\s*(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)\s*(k)?',
        r'(?:inr|rs\.?|₹)\s*([\d,]+(?:\.\d+)?)\s*(k)?',
        r'([\d,]+)\s*(?:inr|rs\.?|₹|rupees)'
    ]
    for pattern in budget_patterns:
        match = re.search(pattern, text_lower)
        if match:
            raw_val = match.group(1).replace(',', '')
            try:
                val = float(raw_val)
                if match.lastindex >= 2 and match.group(2) == 'k':
                    val *= 1000
                budget = val
                break
            except ValueError:
                pass

    # Extract keywords (laptop, mouse, keyboard, monitor, headphone, audio, bag, accessory, electronics)
    categories = ["laptop", "mouse", "keyboard", "monitor", "headphone", "audio", "bag", "accessory", "electronics"]
    found_keyword = None
    for cat in categories:
        if cat in text_lower:
            found_keyword = cat
            break
            
    if not found_keyword:
        # Strip common stopwords
        words = [w for w in re.findall(r'\b[a-zA-Z0-9_-]+\b', text_lower) 
                 if w not in ["i", "need", "a", "an", "the", "for", "under", "below", "with", "want", "to", "buy", "find", "get", "in", "rs", "inr", "rupees"]]
        found_keyword = words[0] if words else text

    return {
        "search_query": found_keyword,
        "max_price": budget
    }


async def understand_request_node(state: AgentState) -> Dict[str, Any]:
    """
    Parse buyer's intent, keywords, and budget constraints from request.
    """
    buyer_request = state.get("buyer_request", "")
    logger.info(f"[Node: UnderstandRequest] Parsing: '{buyer_request}'")

    search_query = state.get("search_query")
    buyer_budget = state.get("buyer_budget")

    if not search_query or buyer_budget is None:
        if settings.LLM_API_KEY:
            try:
                from langchain_openai import ChatOpenAI
                from langchain_core.messages import SystemMessage, HumanMessage
                from app.prompts.agent_prompt import USER_INTENT_EXTRACTION_PROMPT

                llm = ChatOpenAI(
                    model=settings.LLM_MODEL,
                    api_key=settings.LLM_API_KEY,
                    temperature=settings.LLM_TEMPERATURE
                )
                prompt = USER_INTENT_EXTRACTION_PROMPT.format(buyer_request=buyer_request)
                response = await llm.ainvoke([SystemMessage(content="You are an intent extractor."), HumanMessage(content=prompt)])
                parsed = json.loads(response.content)
                search_query = search_query or parsed.get("search_query")
                buyer_budget = buyer_budget if buyer_budget is not None else parsed.get("max_price")
            except Exception as e:
                logger.warning(f"LLM extraction failed, falling back to rule parser: {e}")
                parsed = parse_intent_fallback(buyer_request)
                search_query = search_query or parsed.get("search_query")
                buyer_budget = buyer_budget if buyer_budget is not None else parsed.get("max_price")
        else:
            parsed = parse_intent_fallback(buyer_request)
            search_query = search_query or parsed.get("search_query")
            buyer_budget = buyer_budget if buyer_budget is not None else parsed.get("max_price")

    return {
        "search_query": search_query,
        "buyer_budget": buyer_budget,
        "current_step": "understand_request",
        "status": AgentStatus.SEARCHING.value
    }


async def catalog_search_node(state: AgentState) -> Dict[str, Any]:
    """
    Call the Catalog Search tool to locate matching products in the merchant inventory.
    """
    search_query = state.get("search_query")
    max_price = state.get("buyer_budget")
    merchant_id = state.get("merchant_id", settings.DEFAULT_MERCHANT_ID)

    logger.info(f"[Node: CatalogSearch] Query='{search_query}', max_price={max_price}, merchant_id={merchant_id}")

    result = await execute_catalog_search(
        search_query=search_query,
        max_price=max_price,
        merchant_id=merchant_id
    )

    products = result.get("products", [])
    if not products:
        logger.warning("[Node: CatalogSearch] No matching products found in catalog.")
        return {
            "candidate_products": [],
            "status": AgentStatus.BLOCKED.value,
            "current_step": "catalog_search_empty",
            "final_message": f"I couldn't find any product matching '{search_query}' within your requirements."
        }

    return {
        "candidate_products": products,
        "current_step": "catalog_searched"
    }


async def select_product_node(state: AgentState) -> Dict[str, Any]:
    """
    Select the optimal product candidate within buyer requirements.
    """
    candidates = state.get("candidate_products", [])
    if not candidates:
        return {
            "selected_product": None,
            "status": AgentStatus.BLOCKED.value,
            "current_step": "no_product_selected",
            "final_message": "No product available to select."
        }

    # Select the first matching in-stock product
    selected = candidates[0]
    logger.info(f"[Node: SelectProduct] Selected '{selected.get('product_name')}' (₹{selected.get('price_inr')})")

    return {
        "selected_product": selected,
        "current_step": "product_selected",
        "status": AgentStatus.RECOMMENDATION_PENDING.value
    }


async def growth_recommendation_node(state: AgentState) -> Dict[str, Any]:
    """
    Query backend growth engine for data-backed upsell / cross-sell opportunities.
    Distinguish between RECOMMENDATION vs BUYER APPROVAL.
    """
    selected = state.get("selected_product")
    if not selected:
        return {"current_step": "growth_skipped"}

    product_id = selected.get("product_id") or selected.get("id")
    logger.info(f"[Node: GrowthRecommendation] Querying growth engine for product_id={product_id}")

    growth_data = await execute_growth_recommendation(product_id)
    recommendations = growth_data.get("recommendations", [])

    buyer_decision = (state.get("buyer_decision") or "").strip().lower()

    # If recommendations exist and buyer hasn't made a decision yet
    if recommendations and (not buyer_decision or buyer_decision == "pending"):
        top_rec = recommendations[0]
        rec_name = top_rec.get("name") or top_rec.get("product_name")
        rec_price = top_rec.get("price_inr", 0.0)
        rec_reason = top_rec.get("reason", "Frequently bought together")
        prod_name = selected.get("product_name")
        prod_price = selected.get("price_inr", 0.0)

        message = (
            f"I found the **{prod_name}** for ₹{prod_price:,.2f}.\n\n"
            f"💡 **Recommendation**: {rec_name} is {rec_reason} and costs ₹{rec_price:,.2f}.\n"
            f"Would you like to add it to your basket?"
        )

        return {
            "recommendations": recommendations,
            "status": AgentStatus.AWAITING_BUYER_APPROVAL.value,
            "current_step": "awaiting_buyer_decision",
            "final_message": message
        }

    return {
        "recommendations": recommendations,
        "current_step": "growth_evaluated",
        "status": AgentStatus.RECOMMENDATION_PENDING.value
    }


async def build_basket_node(state: AgentState) -> Dict[str, Any]:
    """
    Build cart items and calculate subtotal/total based on buyer's explicit decision.
    """
    selected = state.get("selected_product")
    if not selected:
        return {
            "cart_items": [],
            "subtotal": 0.0,
            "total": 0.0,
            "status": AgentStatus.ERROR.value,
            "final_message": "Cannot build basket without a selected product."
        }

    prod_id = selected.get("product_id") or selected.get("id")
    prod_name = selected.get("product_name") or selected.get("name")
    prod_price = float(selected.get("price_inr", 0.0))

    cart_items: List[Dict[str, Any]] = [
        {
            "product_id": prod_id,
            "product_name": prod_name,
            "price_inr": prod_price,
            "quantity": 1,
            "is_upsell": False
        }
    ]

    buyer_decision = (state.get("buyer_decision") or "").strip().lower()
    recommendations = state.get("recommendations", [])

    # Add upsell ONLY if explicitly approved by buyer
    if buyer_decision in ["yes", "approved", "approve", "accept", "true", "add"] and recommendations:
        for rec in recommendations:
            cart_items.append({
                "product_id": rec.get("id") or rec.get("product_id"),
                "product_name": rec.get("name") or rec.get("product_name"),
                "price_inr": float(rec.get("price_inr", 0.0)),
                "quantity": 1,
                "is_upsell": True
            })

    total = sum(item["price_inr"] * item["quantity"] for item in cart_items)
    logger.info(f"[Node: BuildBasket] Cart items count={len(cart_items)}, Total=₹{total:,.2f}")

    return {
        "cart_items": cart_items,
        "subtotal": total,
        "total": total,
        "current_step": "basket_built",
        "status": AgentStatus.CHECKING_POLICY.value
    }


async def policy_check_node(state: AgentState) -> Dict[str, Any]:
    """
    Deterministic Policy Evaluation Node.
    CRITICAL: Authoritative check via backend policy engine.
    The agent and LLM NEVER override this result.
    Failures are FAIL-CLOSED.
    """
    merchant_id = state.get("merchant_id", settings.DEFAULT_MERCHANT_ID)
    total = state.get("total", 0.0)

    logger.info(f"[Node: PolicyCheck] Checking merchant_id={merchant_id}, amount_inr={total}")
    result = await execute_policy_check(merchant_id=merchant_id, amount_inr=total)

    is_error = result.get("policy_service_error", False)
    is_allowed = result.get("allowed", False)
    reason = result.get("reason", "")
    max_limit = result.get("max_transaction_inr", 0.0)

    if is_error:
        # FAIL CLOSED
        msg = f"I couldn't verify the transaction policy, so I cannot proceed with the purchase. ({reason})"
        logger.error(f"[Node: PolicyCheck] Policy Service unavailable: {reason}")
        return {
            "policy_result": result,
            "status": AgentStatus.ERROR.value,
            "current_step": "policy_service_failed",
            "final_message": msg,
            "error_message": reason
        }

    if not is_allowed:
        # POLICY BLOCKED
        msg = f"Purchase blocked because the total of ₹{total:,.2f} exceeds the merchant's policy limit (Limit: ₹{max_limit:,.2f}). Reason: {reason}"
        logger.warning(f"[Node: PolicyCheck] Blocked by policy engine: {reason}")
        return {
            "policy_result": result,
            "status": AgentStatus.BLOCKED.value,
            "current_step": "policy_blocked",
            "final_message": msg
        }

    # POLICY ALLOWED -> READY FOR PAYMENT (NO PAYMENT PERFORMED)
    cart_desc = ", ".join([f"{item['product_name']} (₹{item['price_inr']:,.2f})" for item in state.get("cart_items", [])])
    msg = f"Policy approved: Transaction is within allowed limit. Your basket [{cart_desc}] with total ₹{total:,.2f} is ready for payment."
    logger.info(f"[Node: PolicyCheck] Approved by policy engine. Status: ready_for_payment")

    return {
        "policy_result": result,
        "status": AgentStatus.READY_FOR_PAYMENT.value,
        "current_step": "policy_approved",
        "final_message": msg
    }
