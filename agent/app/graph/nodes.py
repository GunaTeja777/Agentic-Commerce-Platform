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
from app.tools.payment_tool import execute_payment_initiation
from app.services.backend_client import backend_client, BackendClientError

logger = logging.getLogger("agent.graph.nodes")


def get_curation_llm_instance():
    """
    Instantiate Hugging Face Inference LLM for query curation.
    """
    curation_key = settings.effective_curation_key
    if not curation_key:
        return None
    try:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            base_url="https://api-inference.huggingface.co/v1",
            api_key=curation_key,
            model=settings.CURATION_MODEL or "meta-llama/Llama-3.2-3B-Instruct",
            temperature=0.1
        )
    except Exception as e:
        logger.warning(f"Could not initialize Hugging Face Curation LLM: {e}")
        return None


def get_llm_instance():
    """
    Instantiate main agent LLM (Google Gemini) for LangGraph StateGraph orchestration.
    """
    api_key = settings.effective_api_key
    if not api_key:
        return None

    provider = settings.LLM_PROVIDER.lower()
    try:
        if provider in ["gemini", "google"]:
            from langchain_google_genai import ChatGoogleGenerativeAI
            model_name = settings.LLM_MODEL if "gemini" in settings.LLM_MODEL else "gemini-1.5-flash"
            return ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=api_key,
                temperature=settings.LLM_TEMPERATURE
            )
        elif provider in ["huggingface", "hf"]:
            from langchain_openai import ChatOpenAI
            model_name = settings.LLM_MODEL if settings.LLM_MODEL and "gemini" not in settings.LLM_MODEL else "meta-llama/Llama-3.2-3B-Instruct"
            return ChatOpenAI(
                base_url="https://api-inference.huggingface.co/v1",
                api_key=api_key,
                model=model_name,
                temperature=settings.LLM_TEMPERATURE
            )
        elif provider == "groq":
            from langchain_openai import ChatOpenAI
            model_name = settings.LLM_MODEL if settings.LLM_MODEL and "gemini" not in settings.LLM_MODEL else "llama-3.1-8b-instant"
            return ChatOpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=api_key,
                model=model_name,
                temperature=settings.LLM_TEMPERATURE
            )
        elif provider == "openai":
            from langchain_openai import ChatOpenAI
            model_name = settings.LLM_MODEL if "gpt" in settings.LLM_MODEL else "gpt-4o-mini"
            return ChatOpenAI(
                model=model_name,
                api_key=api_key,
                temperature=settings.LLM_TEMPERATURE
            )
    except Exception as e:
        logger.warning(f"Could not initialize LLM ({provider}): {e}")
    return None


def parse_intent_fallback(text: str) -> Dict[str, Any]:
    """
    Pure dynamic fallback parser for budget and search tokens
    when LLM is offline or in mock test mode without any hardcoded categories.
    """
    text_lower = text.lower()
    
    # Extract numerical budget if specified (e.g., under 70000, 60k, ₹50,000)
    budget = None
    budget_match = re.search(r'(?:under|below|max|budget|within|upto|up\s+to|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)\s*(k)?\b', text_lower)
    if budget_match:
        raw_val = budget_match.group(1).replace(',', '')
        try:
            val = float(raw_val)
            if budget_match.group(2) == 'k':
                val *= 1000
            if val > 0:
                budget = val
        except ValueError:
            pass

    # Dynamically extract search term by filtering common grammatical filler words
    STOPWORDS = {
        "i", "me", "my", "we", "our", "you", "your", "need", "want", "looking", "for", 
        "search", "find", "get", "buy", "purchase", "a", "an", "the", "and", "or", "in", 
        "with", "under", "below", "above", "around", "near", "upto", "budget", "rs", "inr", 
        "rupees", "please", "can", "good", "best", "cheap", "some"
    }
    raw_tokens = [w for w in re.findall(r'\b[a-zA-Z0-9_-]+\b', text_lower) if w not in STOPWORDS and not w.isdigit()]
    search_keyword = " ".join(raw_tokens[:2]) if raw_tokens else "product"
    
    return {
        "search_query": search_keyword,
        "max_price": budget,
        "category": search_keyword.title(),
        "use_case": "general",
        "priority_feature": "standard",
        "intent": f"purchase_{search_keyword.replace(' ', '_')}"
    }


async def curate_user_intent_with_llm(buyer_request: str) -> Dict[str, Any]:
    """
    Curate the buyer's query using Hugging Face Llama 3.2 Curation LLM
    with automatic JSON parsing and robust dynamic fallback.
    """
    llm = get_curation_llm_instance() or get_llm_instance()
    if llm:
        try:
            from langchain_core.messages import SystemMessage, HumanMessage
            from app.prompts.agent_prompt import USER_INTENT_EXTRACTION_PROMPT

            prompt = USER_INTENT_EXTRACTION_PROMPT.format(buyer_request=buyer_request)
            response = await llm.ainvoke([
                SystemMessage(content="You are an intent curation engine. Return only valid JSON."),
                HumanMessage(content=prompt)
            ])
            content = str(response.content).strip()
            json_match = re.search(r'(\{.*\})', content, re.DOTALL)
            if json_match:
                content = json_match.group(1)
            elif content.startswith("```json"):
                content = content[7:].rstrip("`").strip()
            elif content.startswith("```"):
                content = content[3:].rstrip("`").strip()
            
            parsed = json.loads(content.strip())
            
            sq = parsed.get("search_query") or "product"
            mp = parsed.get("max_price")
            cat = parsed.get("category") or "General"
            uc = parsed.get("use_case") or "work"
            pf = parsed.get("priority_feature") or "standard"

            return {
                "search_query": sq,
                "max_price": float(mp) if mp is not None else None,
                "category": cat,
                "use_case": uc,
                "priority_feature": pf,
                "intent": f"purchase_{sq}"
            }
        except Exception as e:
            logger.warning(f"LLM curation error ({e}), falling back to regex parser.")
    
    return parse_intent_fallback(buyer_request)


async def understand_request_node(state: AgentState) -> Dict[str, Any]:
    """
    Parse buyer's intent, keywords, and budget constraints from request.
    Uses configured LLM curation, or fallback parser if API key is not supplied.
    """
    buyer_request = state.get("buyer_request", "")
    logger.info(f"[Node: UnderstandRequest] Parsing: '{buyer_request}'")

    search_query = state.get("search_query")
    buyer_budget = state.get("buyer_budget")
    structured_req = state.get("structured_request")

    if structured_req:
        search_query = search_query or structured_req.get("category")
        buyer_budget = buyer_budget if buyer_budget is not None else structured_req.get("budget_inr")

    if not search_query or buyer_budget is None:
        curated = await curate_user_intent_with_llm(buyer_request)
        search_query = search_query or curated.get("search_query")
        buyer_budget = buyer_budget if buyer_budget is not None else curated.get("max_price")

    return {
        "search_query": search_query,
        "buyer_budget": buyer_budget,
        "current_step": "understand_request",
        "status": AgentStatus.SEARCHING.value
    }


async def catalog_search_node(state: AgentState) -> Dict[str, Any]:
    """
    Formulate optimized search parameters via Gemini and query the backend catalog tool.
    """
    search_query = state.get("search_query")
    max_price = state.get("buyer_budget")
    merchant_id = state.get("merchant_id", settings.DEFAULT_MERCHANT_ID)
    buyer_request = state.get("buyer_request", "")
    structured_req = state.get("structured_request") or {}

    # If Gemini is available, formulate optimized query terms
    llm = get_llm_instance()
    search_keywords = [search_query] if search_query else []
    
    if llm and buyer_request and not search_keywords:
        try:
            from langchain_core.messages import SystemMessage, HumanMessage
            prompt = (
                f"Extract the most relevant 1-2 search terms for finding a product in a merchant catalog database.\n"
                f"Buyer Request: '{buyer_request}'\n"
                f"Category: {structured_req.get('category')}\n"
                f"Output ONLY a raw comma-separated list of 1-2 keywords, e.g.: laptop, ultrabook"
            )
            resp = await llm.ainvoke([
                SystemMessage(content="You are a search query formulation expert. Return only comma-separated terms."),
                HumanMessage(content=prompt)
            ])
            terms = [t.strip().strip('"').strip("'") for t in str(resp.content).split(",") if t.strip()]
            if terms:
                search_keywords = terms
        except Exception as e:
            logger.warning(f"Gemini search term formulation fallback: {e}")

    final_search = " ".join(search_keywords) if search_keywords else search_query

    logger.info(f"[Node: CatalogSearch] Query='{final_search}', max_price={max_price}, merchant_id={merchant_id}")

    result = await execute_catalog_search(
        search_query=final_search,
        max_price=max_price,
        merchant_id=merchant_id
    )

    products = result.get("products", [])
    if not products and search_keywords and len(search_keywords) > 1:
        first_term = search_keywords[0]
        result = await execute_catalog_search(
            search_query=first_term,
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
            "final_message": f"I couldn't find any product matching '{final_search or search_query}' within your requirements."
        }

    return {
        "candidate_products": products,
        "current_step": "catalog_searched"
    }


async def select_product_node(state: AgentState) -> Dict[str, Any]:
    """
    Select the optimal product candidate within buyer requirements using Gemini evaluation.
    """
    candidates = state.get("candidate_products", [])
    if not candidates:
        return {
            "selected_product": None,
            "status": AgentStatus.BLOCKED.value,
            "current_step": "no_product_selected",
            "final_message": "No product available to select."
        }

    buyer_request = state.get("buyer_request", "")
    llm = get_llm_instance()

    # Pre-rank candidates based on title & category keyword match relevance
    req_tokens = set(re.findall(r'\b[a-zA-Z0-9]+\b', buyer_request.lower()))
    def score_candidate(c):
        p_name = str(c.get("product_name", "")).lower()
        p_cat = str(c.get("category", "")).lower()
        p_desc = str(c.get("description", "")).lower()
        score = 0
        for w in req_tokens:
            if len(w) > 2 and w not in ["the", "and", "for", "with", "want", "need", "buy"]:
                if w in p_name:
                    score += 15
                if w in p_cat:
                    score += 5
                if w in p_desc:
                    score += 1
        return score

    sorted_candidates = sorted(candidates, key=score_candidate, reverse=True)
    selected = sorted_candidates[0]

    if len(sorted_candidates) > 1 and llm and buyer_request:
        try:
            from langchain_core.messages import SystemMessage, HumanMessage
            summary_list = [
                f"ID {c.get('product_id')}: {c.get('product_name')} - Price: ₹{c.get('price_inr')}, Rating: {c.get('rating', 4.5)}, Category: {c.get('category')}, Description: {c.get('description', '')}"
                for c in sorted_candidates[:5]
            ]
            prompt = (
                f"Select the single best product matching the buyer's request.\n"
                f"Buyer Request: '{buyer_request}'\n\n"
                f"Available Products:\n" + "\n".join(summary_list) + "\n\n"
                f"Return ONLY a JSON object: {{\"selected_product_id\": <number>}}"
            )
            resp = await llm.ainvoke([
                SystemMessage(content="You are a commerce product matching expert. Return only JSON with selected_product_id."),
                HumanMessage(content=prompt)
            ])
            match = re.search(r'\{\s*"selected_product_id"\s*:\s*(\d+)\s*\}', str(resp.content))
            if match:
                chosen_id = int(match.group(1))
                found = next((c for c in sorted_candidates if c.get("product_id") == chosen_id), None)
                if found:
                    selected = found
        except Exception as e:
            logger.warning(f"Gemini product selection fallback: {e}")

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
        prod_price = selected.get("price_inr", 0.0)
        prod_name = selected.get("product_name")

        # Prefer sensible add-on accessories (less expensive than main product or proportional)
        ranked_recs = sorted(
            recommendations,
            key=lambda r: (
                0 if r.get("price_inr", 0) <= prod_price * 1.2 else 1,
                r.get("price_inr", 0)
            )
        )
        top_rec = ranked_recs[0]
        rec_name = top_rec.get("name") or top_rec.get("product_name")
        rec_price = top_rec.get("price_inr", 0.0)
        rec_reason = top_rec.get("reason", "Frequently bought together")

        message = (
            f"I found the **{prod_name}** for ₹{prod_price:,.2f}.\n\n"
            f"💡 **Recommendation**: {rec_name} is {rec_reason} and costs ₹{rec_price:,.2f}.\n"
            f"Would you like to add it to your basket?"
        )

        return {
            "recommendations": ranked_recs,
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
    request_id = state.get("request_id")

    logger.info(f"[Node: PolicyCheck] Checking merchant_id={merchant_id}, amount_inr={total}, request_id={request_id}")
    result = await execute_policy_check(merchant_id=merchant_id, amount_inr=total, request_id=request_id)

    is_error = result.get("policy_service_error", False)
    is_allowed = result.get("allowed", False)
    reason = result.get("reason", "")
    max_limit = result.get("max_transaction_inr", 0.0)

    if is_error:
        # FAIL CLOSED
        msg = f"I couldn't verify the transaction policy, so I cannot proceed with the purchase. Payment authorization could not be completed because the merchant policy service is unavailable. ({reason})"
        logger.error(f"[Node: PolicyCheck] Policy Service unavailable (FAIL-CLOSED): {reason}")
        return {
            "policy_result": result,
            "status": AgentStatus.ERROR.value,
            "current_step": "policy_service_failed",
            "final_message": msg,
            "error_message": reason,
            "razorpay_call_count": 0
        }

    if not is_allowed:
        # POLICY BLOCKED - Fail closed, strictly refuse payment
        msg = f"Purchase blocked: Total of ₹{total:,.2f} exceeds authorized spending limit (Policy Limit: ₹{max_limit:,.2f}). Reason: {reason}. Payment blocked before payment provider call."
        logger.warning(f"[Node: PolicyCheck] Blocked by policy engine: {reason}")
        return {
            "policy_result": result,
            "status": AgentStatus.BLOCKED.value,
            "current_step": "policy_blocked",
            "final_message": msg
        }

    # POLICY ALLOWED
    logger.info(f"[Node: PolicyCheck] Approved by policy engine (₹{total:,.2f} <= ₹{max_limit:,.2f})")
    return {
        "policy_result": result,
        "status": AgentStatus.CHECKING_POLICY.value,
        "current_step": "policy_approved",
        "final_message": f"Policy approved: Total ₹{total:,.2f} is within limit ₹{max_limit:,.2f}."
    }


async def payment_initiation_node(state: AgentState) -> Dict[str, Any]:
    """
    Payment Stage Node.
    Executed ONLY after deterministic Policy Gate returns allowed == True.
    Creates internal DB order and initiates Razorpay test order.
    """
    policy_res = state.get("policy_result") or {}
    if not policy_res.get("allowed", False):
        logger.warning("[Node: PaymentInitiation] Policy Gate blocked payment initiation.")
        return {
            "status": AgentStatus.BLOCKED.value,
            "current_step": "payment_blocked_by_policy",
            "final_message": "Payment initiation was blocked by the policy gate.",
            "razorpay_call_count": 0
        }

    merchant_id = state.get("merchant_id", settings.DEFAULT_MERCHANT_ID)
    buyer_id = state.get("buyer_id", "demo-ai-buyer")
    cart_items = state.get("cart_items", [])
    total = state.get("total", 0.0)
    request_id = state.get("request_id")

    try:
        # 1. Create Order in PostgreSQL
        order_res = await backend_client.create_order(
            merchant_id=merchant_id,
            buyer_id=buyer_id,
            items=cart_items,
            request_id=request_id
        )
        order_id = order_res.get("order_id")
        logger.info(f"[Node: PaymentInitiation] DB Order #{order_id} created successfully")

        # 2. Call Payment Tool to generate Razorpay Test Order
        payment_data = await execute_payment_initiation(
            merchant_id=merchant_id,
            order_id=order_id,
            policy_allowed=True,
            request_id=request_id
        )

        razorpay_order_id = payment_data.get("razorpay_order_id")
        cart_desc = ", ".join([f"{item['product_name']} (₹{item['price_inr']:,.2f})" for item in cart_items])
        msg = (
            f"✓ **Policy Approved**: Total ₹{total:,.2f} verified.\n"
            f"✓ **Order Created**: ORD-{order_id}\n"
            f"✓ **Razorpay Test Order**: {razorpay_order_id}\n\n"
            f"Items: {cart_desc}\n"
            f"Ready for Razorpay Test Mode checkout."
        )

        return {
            "order_id": order_id,
            "payment_info": payment_data,
            "payment_status": "ready_for_checkout",
            "status": AgentStatus.READY_FOR_PAYMENT.value,
            "current_step": "payment_order_created",
            "final_message": msg,
            "razorpay_call_count": 1
        }
    except Exception as e:
        logger.error(f"[Node: PaymentInitiation] Error preparing payment: {e}")
        return {
            "status": AgentStatus.ERROR.value,
            "current_step": "payment_preparation_failed",
            "final_message": f"Payment authorization could not be completed: {str(e)}",
            "error_message": str(e)
        }


async def policy_blocked_node(state: AgentState) -> Dict[str, Any]:
    """
    Blocked Stage Node.
    Explicitly confirms that Razorpay was NOT called and payment was NOT attempted.
    """
    total = state.get("total", 0.0)
    policy_res = state.get("policy_result") or {}
    max_limit = policy_res.get("max_transaction_inr", 70000.0)
    reason = policy_res.get("reason", "Transaction exceeds authorized limit")

    msg = (
        f"✕ **Purchase Blocked**: ₹{total:,.2f} exceeds buyer authorization limit of ₹{max_limit:,.2f}.\n"
        f"**Reason**: {reason}\n\n"
        f"**Payment Service**: NOT CALLED\n"
        f"**Razorpay**: NOT CALLED (0 API calls)"
    )

    return {
        "status": AgentStatus.BLOCKED.value,
        "payment_status": "blocked",
        "payment_info": None,
        "current_step": "policy_blocked_final",
        "final_message": msg,
        "razorpay_call_count": 0
    }
