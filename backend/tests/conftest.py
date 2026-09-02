import sys
import os
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy import update
from app.core.database import AsyncSessionLocal
from app.models.product import Product
from app.main import app

@pytest.fixture(autouse=True)
async def reset_test_stock():
    """Ensure standard test products have healthy inventory and active status."""
    async with AsyncSessionLocal() as session:
        try:
            await session.execute(
                update(Product)
                .where(Product.product_id.in_([1001, 1002, 1003, 1010, 1020, 1021, 1030, 2001]))
                .values(stock_quantity=50, is_active=True)
            )
            await session.commit()
        except Exception:
            await session.rollback()
    yield

@pytest.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
