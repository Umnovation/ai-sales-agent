from __future__ import annotations

from fastapi import Query
from pydantic import BaseModel

from app.common.schemas import PaginatedResponse


class PaginationParams(BaseModel):
    """Query parameters for paginated endpoints."""

    page: int = 1
    per_page: int = 20

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page


def get_pagination(
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=100, description="Items per page"),
) -> PaginationParams:
    return PaginationParams(page=page, per_page=per_page)


def build_paginated_response[T](
    items: list[T],
    total: int,
    pagination: PaginationParams,
) -> PaginatedResponse[T]:
    return PaginatedResponse[T](
        success=True,
        message="",
        data=items,
        total=total,
        page=pagination.page,
        per_page=pagination.per_page,
        has_more=(pagination.page * pagination.per_page) < total,
    )
