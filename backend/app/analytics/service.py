from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import Date, and_, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.schemas import AnalyticsSummary, ConversationDataPoint
from app.chat.models import Chat


async def get_summary(db: AsyncSession) -> AnalyticsSummary:
    # Total non-test chats
    total_result = await db.execute(select(func.count(Chat.id)).where(Chat.is_test.is_(False)))
    total: int = total_result.scalar_one()

    # Active (bot still controlling)
    active_result = await db.execute(
        select(func.count(Chat.id)).where(
            Chat.is_test.is_(False),
            Chat.is_controlled_by_bot.is_(True),
            Chat.termination_reason.is_(None),
        )
    )
    active: int = active_result.scalar_one()

    # Completed (has a termination reason indicating completion)
    completed_result = await db.execute(
        select(func.count(Chat.id)).where(
            Chat.is_test.is_(False),
            Chat.termination_reason.in_(["goal_achieved"]),
        )
    )
    completed: int = completed_result.scalar_one()

    rate: float = (completed / total) if total > 0 else 0.0

    return AnalyticsSummary(
        total_chats=total,
        active_chats=active,
        completed_chats=completed,
        completion_rate=round(rate, 3),
    )


async def get_conversations_over_time(
    db: AsyncSession, days: int = 30
) -> list[ConversationDataPoint]:
    since: datetime = datetime.now(UTC) - timedelta(days=days)

    result = await db.execute(
        select(
            cast(Chat.created_at, Date).label("date"),
            func.count(Chat.id).label("count"),
        )
        .where(
            and_(
                Chat.is_test.is_(False),
                Chat.created_at >= since,
            )
        )
        .group_by(cast(Chat.created_at, Date))
        .order_by(cast(Chat.created_at, Date))
    )

    rows = result.all()
    return [ConversationDataPoint(date=str(row.date), count=row.count) for row in rows]
