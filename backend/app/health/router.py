from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_ai_provider, get_db

router = APIRouter(tags=["health"])


class ComponentHealth(BaseModel):
    status: str  # "ok" | "error"
    detail: str | None = None


class HealthResponse(BaseModel):
    status: str  # "healthy" | "degraded"
    checks: dict[str, ComponentHealth]


@router.get("/health")
async def health_check(
    db: AsyncSession = Depends(get_db),
) -> HealthResponse:
    checks: dict[str, ComponentHealth] = {}

    # PostgreSQL
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = ComponentHealth(status="ok")
    except Exception as e:
        checks["database"] = ComponentHealth(status="error", detail=str(e))

    # Redis
    try:
        import redis.asyncio as aioredis

        from app.config import settings

        r = aioredis.from_url(settings.redis_url)
        await r.ping()
        await r.aclose()
        checks["redis"] = ComponentHealth(status="ok")
    except Exception as e:
        checks["redis"] = ComponentHealth(status="error", detail=str(e))

    # AI Provider
    try:
        provider = get_ai_provider()
        await provider.validate_connection()
        checks["ai_provider"] = ComponentHealth(status="ok")
    except Exception as e:
        checks["ai_provider"] = ComponentHealth(status="error", detail=str(e))

    all_ok: bool = all(c.status == "ok" for c in checks.values())

    return HealthResponse(
        status="healthy" if all_ok else "degraded",
        checks=checks,
    )
