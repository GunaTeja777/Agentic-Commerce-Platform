from enum import Enum
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict, field_validator


class AgentStatus(str, Enum):
    """Lifecycle statuses for the LangGraph Agent."""
    SEARCHING = "searching"
    RECOMMENDATION_PENDING = "recommendation_pending"
    AWAITING_BUYER_APPROVAL = "awaiting_buyer_approval"
    CHECKING_POLICY = "checking_policy"
    READY_FOR_PAYMENT = "ready_for_payment"
    BLOCKED = "blocked"
    ERROR = "error"


class ProductResult(BaseModel):
    """Product model returned by catalog search."""
    product_id: int
    product_name: str
    category: str
    price_inr: float
    stock_quantity: int
    rating: Optional[float] = 0.0
    description: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)
    image_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator('tags', mode='before')
    @classmethod
    def parse_tags(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            return [t.strip() for t in v.split(',') if t.strip()]
        if isinstance(v, list):
            return [str(item) for item in v]
        return []


class ProductCatalogResponse(BaseModel):
    """Catalog response format."""
    total: int
    products: List[ProductResult]


class GrowthRecommendationItem(BaseModel):
    """Individual upsell / cross-sell item."""
    id: int
    name: str
    price_inr: float
    stock: int
    relationship_type: str = "frequently_bought_with"
    reason: str

    model_config = ConfigDict(from_attributes=True)


class GrowthBaseProduct(BaseModel):
    """Base product for growth recommendations."""
    id: int
    name: str
    price_inr: float


class GrowthRecommendationResponse(BaseModel):
    """Growth recommendations container."""
    base_product: GrowthBaseProduct
    recommendations: List[GrowthRecommendationItem] = Field(default_factory=list)


class PolicyCheckRequest(BaseModel):
    """Payload sent to backend Policy Engine."""
    merchant_id: int
    amount_inr: float


class PolicyResult(BaseModel):
    """Authoritative Policy check result."""
    allowed: bool
    reason: str
    max_transaction_inr: float
    requested_amount_inr: float


class CartItem(BaseModel):
    """Item in the proposed or finalized cart."""
    product_id: int
    product_name: str
    price_inr: float
    quantity: int = 1
    is_upsell: bool = False


class AgentErrorCode(str, Enum):
    """Standardized error codes for commerce agent and backend operations."""
    PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND"
    PRODUCT_INACTIVE = "PRODUCT_INACTIVE"
    INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK"
    POLICY_BLOCKED = "POLICY_BLOCKED"
    POLICY_SERVICE_UNAVAILABLE = "POLICY_SERVICE_UNAVAILABLE"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    PAYMENT_ALREADY_COMPLETED = "PAYMENT_ALREADY_COMPLETED"
    INVALID_PAYMENT_SIGNATURE = "INVALID_PAYMENT_SIGNATURE"
    INVALID_WEBHOOK_SIGNATURE = "INVALID_WEBHOOK_SIGNATURE"


class BuyerPreferences(BaseModel):
    use_case: Optional[str] = "work"
    priority: Optional[str] = "battery"
    model_config = ConfigDict(extra="allow")


class BuyerAuthorization(BaseModel):
    max_amount_inr: float = 70000.0
    allow_recommendations: bool = True
    model_config = ConfigDict(extra="allow")


class StructuredBuyerRequest(BaseModel):
    """Structured Agent-to-Agent request payload sent by AI Buyer."""
    buyer_id: str = "demo-ai-buyer"
    intent: str = "purchase"
    category: str = "laptop"
    budget_inr: float = 70000.0
    preferences: Optional[BuyerPreferences] = Field(default_factory=BuyerPreferences)
    authorization: Optional[BuyerAuthorization] = Field(default_factory=BuyerAuthorization)
    request_id: Optional[str] = None


class StructuredPolicyResponse(BaseModel):
    """Clean policy summary for structured agent response."""
    allowed: bool
    limit_inr: float
    reason: Optional[str] = None


class AgentResponse(BaseModel):
    """Standard response model emitted by the Agent."""
    status: AgentStatus
    message: str
    merchant_id: int
    selected_product: Optional[ProductResult] = None
    recommendations: List[GrowthRecommendationItem] = Field(default_factory=list)
    cart: List[CartItem] = Field(default_factory=list)
    items: List[CartItem] = Field(default_factory=list)  # Alias for structured contract
    subtotal_inr: float = 0.0
    total_inr: float = 0.0
    policy_result: Optional[PolicyResult] = None
    policy: Optional[StructuredPolicyResponse] = None
    order_id: Optional[int] = None
    payment_info: Optional[Dict[str, Any]] = None
    next_action: Optional[str] = None
    request_id: Optional[str] = None


class AgentChatRequest(BaseModel):
    """Input payload for agent execution or multi-turn chat."""
    message: Optional[str] = Field(default=None, description="Buyer query or input message")
    structured_request: Optional[StructuredBuyerRequest] = Field(default=None, description="Structured A2A Buyer intent")
    merchant_id: int = Field(default=1, description="Target Merchant ID")
    buyer_id: Optional[str] = Field(default="demo-ai-buyer", description="Identifier for buyer")
    buyer_decision: Optional[str] = Field(
        default=None,
        description="Explicit approval ('yes'/'approve') or rejection ('no'/'reject') for pending upsells"
    )
    context: Optional[Dict[str, Any]] = Field(default=None, description="Optional conversation state context")
    request_id: Optional[str] = Field(default=None, description="Correlation / Request ID")
