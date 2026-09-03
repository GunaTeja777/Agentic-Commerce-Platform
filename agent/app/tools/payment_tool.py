import json
import logging
from typing import Dict, Any, Optional
from langchain_core.tools import tool

from app.services.backend_client import backend_client, BackendClientError

logger = logging.getLogger("agent.tools.payment")


async def execute_payment_initiation(
    merchant_id: int,
    order_id: Any,
    policy_allowed: bool = False,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Execute Razorpay test payment order creation with strict policy gating.
    
    CRITICAL:
    If policy_allowed is False, this tool strictly REFUSES to execute and
    Razorpay is NEVER contacted.
    """
    if not policy_allowed:
        logger.warning(f"[PAYMENT TOOL] Policy Gate Refusal for Order {order_id}: Allowed=False")
        return {
            "status": "blocked",
            "reason": "Payment initiation blocked by merchant policy gate. Transaction limits exceeded.",
            "payment_attempted": False,
            "order_id": order_id,
            "razorpay_call_count": 0,
            "request_id": request_id
        }

    try:
        logger.info(f"[PAYMENT TOOL] Calling backend to create Razorpay test order for Order {order_id}")
        res = await backend_client.create_payment_order(order_id=order_id, request_id=request_id)
        return {
            "status": "ready_for_checkout",
            "payment_attempted": True,
            "order_id": order_id,
            "razorpay_order_id": res.get("razorpay_order_id"),
            "amount": res.get("amount"),
            "amount_inr": res.get("amount_inr"),
            "currency": res.get("currency", "INR"),
            "key_id": res.get("key_id"),
            "receipt": res.get("receipt"),
            "request_id": request_id
        }
    except BackendClientError as e:
        logger.error(f"[PAYMENT TOOL] Backend payment creation error: {e}")
        return {
            "status": "error",
            "reason": f"Payment initialization failed: {str(e)}",
            "payment_attempted": False,
            "order_id": order_id,
            "error_code": "PAYMENT_INITIATION_FAILED",
            "request_id": request_id
        }
    except Exception as e:
        logger.error(f"[PAYMENT TOOL] Unexpected payment tool error: {e}")
        return {
            "status": "error",
            "reason": f"Unexpected error during payment initialization: {str(e)}",
            "payment_attempted": False,
            "order_id": order_id,
            "error_code": "PAYMENT_INITIATION_ERROR",
            "request_id": request_id
        }


@tool
async def payment_tool(order_id: int, merchant_id: int = 1, policy_allowed: bool = False) -> str:
    """
    Initiate a Razorpay Test Mode checkout for a policy-approved order.
    
    IMPORTANT:
    This tool CANNOT be executed directly unless policy_allowed == true.
    The LLM cannot override this check.
    
    Inputs:
    - order_id: Verified internal order ID in PostgreSQL
    - merchant_id: Merchant ID (default: 1)
    - policy_allowed: Boolean authorization flag from deterministic Policy Engine
    
    Returns structured JSON with payment initialization status and Razorpay test order ID.
    """
    result = await execute_payment_initiation(
        merchant_id=merchant_id,
        order_id=order_id,
        policy_allowed=policy_allowed
    )
    return json.dumps(result)
