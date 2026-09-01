from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter(tags=["Health"])

@router.get("/health", summary="Database & API Health Check")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT 1"))
        result.scalar_one()
        return {
            "status": "ok",
            "database": "connected"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database connection failure: {str(e)}"
        )
