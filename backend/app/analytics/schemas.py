from __future__ import annotations

from pydantic import BaseModel


class AnalyticsSummary(BaseModel):
    total_chats: int
    active_chats: int
    completed_chats: int
    completion_rate: float  # 0.0 - 1.0


class ConversationDataPoint(BaseModel):
    date: str  # ISO date
    count: int
