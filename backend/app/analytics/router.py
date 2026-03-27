from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics import service as analytics_service
from app.analytics.schemas import AnalyticsSummary, ConversationDataPoint
from app.auth.models import User
from app.common.schemas import ApiResponse
from app.dependencies import get_current_user, get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[AnalyticsSummary]:
    summary = await analytics_service.get_summary(db)
    return ApiResponse.ok(data=summary)


@router.get("/conversations")
async def get_conversations(
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[list[ConversationDataPoint]]:
    data = await analytics_service.get_conversations_over_time(db, days)
    return ApiResponse.ok(data=data)
