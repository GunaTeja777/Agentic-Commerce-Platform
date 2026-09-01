import json
import logging
from typing import Dict, Any
from langchain_core.tools import tool

from app.services.backend_client import backend_client, PolicyServiceUnavailableError
from app.schemas.agent_schemas import PolicyResult

logger = logging.getLogger("agent.tools.policy")


async def execute_policy_check(merchant_id: int, amount_inr: float) -> Dict[str, Any]:
    """
    Check if a transaction amount is allowed by the merchant's deterministic policy.
    CRITICAL: This policy is authoritative. If policy engine is unreachable, fails CLOSED.
    """
    try:
        result: PolicyResult = await backend_client.check_policy(
            merchant_id=merchant_id,
            amount_inr=amount_inr
        )
        return {
            "success": True,
            "allowed": result.allowed,
            "reason": result.reason,
            "max_transaction_inr": result.max_transaction_inr,
            "requested_amount_inr": result.requested_amount_inr,
            "policy_service_error": False
        }
    except PolicyServiceUnavailableError as e:
        logger.error(f"Policy Engine unavailable (FAIL-CLOSED): {e}")
        return {
            "success": False,
            "allowed": False,
            "reason": f"Policy verification failed: {str(e)}",
            "max_transaction_inr": 0.0,
            "requested_amount_inr": amount_inr,
            "policy_service_error": True
        }
    except Exception as e:
        logger.error(f"Unexpected policy tool error (FAIL-CLOSED): {e}")
        return {
            "success": False,
            "allowed": False,
            "reason": f"Unable to verify transaction policy: {str(e)}",
            "max_transaction_inr": 0.0,
            "requested_amount_inr": amount_inr,
            "policy_service_error": True
        }


@tool
async def policy_check(merchant_id: int, amount_inr: float) -> str:
    """
    Determine whether the current basket transaction amount is allowed by merchant limits.
    This check is authoritative and deterministic. The LLM cannot override this result.
    Input arguments:
    - merchant_id: ID of the merchant (e.g. 1)
    - amount_inr: Total proposed transaction amount in INR (e.g. 66500)
    
    Returns structured JSON with 'allowed' boolean flag and official limit reason.
    """
    result = await execute_policy_check(merchant_id=merchant_id, amount_inr=amount_inr)
    return json.dumps(result)
