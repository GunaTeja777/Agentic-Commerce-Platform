from app.api.routes.health import router as health_router
from app.api.routes.products import router as products_router
from app.api.routes.growth import router as growth_router
from app.api.routes.policies import router as policies_router
from app.api.routes.orders import router as orders_router
from app.api.routes.payments import router as payments_router
from app.api.routes.audit import router as audit_router

__all__ = [
    "health_router",
    "products_router",
    "growth_router",
    "policies_router",
    "orders_router",
    "payments_router",
    "audit_router",
]
