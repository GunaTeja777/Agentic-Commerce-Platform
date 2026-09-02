from typing import List, Dict, Any, Optional
from typing_extensions import TypedDict


class AgentState(TypedDict, total=False):
    """
    Strongly-typed state for the Merchant Growth LangGraph workflow.
    """
    # Request identifiers & inputs
    buyer_request: str
    merchant_id: int
    buyer_id: str
    buyer_budget: Optional[float]
    search_query: Optional[str]

    # Product search & selection
    candidate_products: List[Dict[str, Any]]
    selected_product: Optional[Dict[str, Any]]

    # Growth & Upsell
    recommendations: List[Dict[str, Any]]
    buyer_decision: Optional[str]  # "approved" / "yes", "rejected" / "no", or None / "pending"

    # Basket calculation
    cart_items: List[Dict[str, Any]]
    subtotal: float
    total: float

    # Deterministic Policy Check
    policy_result: Optional[Dict[str, Any]]

    # Payment & Razorpay Test Order
    order_id: Optional[int]
    payment_info: Optional[Dict[str, Any]]
    payment_status: Optional[str]

    # Correlation and structured contract
    request_id: Optional[str]
    structured_request: Optional[Dict[str, Any]]
    razorpay_call_count: Optional[int]

    # Workflow lifecycle & messaging
    status: str
    current_step: str
    final_message: str
    conversation_messages: List[Dict[str, Any]]
    audit_context: Dict[str, Any]
    error_message: Optional[str]
