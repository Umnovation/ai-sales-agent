from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standardized API response envelope."""

    success: bool
    message: str
    data: T | None = None
    errors: dict[str, list[str]] | None = None

    @classmethod
    def ok(cls, data: T, message: str = "") -> ApiResponse[T]:
        return cls(success=True, message=message, data=data)

    @classmethod
    def created(cls, data: T, message: str = "") -> ApiResponse[T]:
        return cls(success=True, message=message, data=data)

    @classmethod
    def error(
        cls,
        message: str,
        errors: dict[str, list[str]] | None = None,
    ) -> ApiResponse[None]:
        return ApiResponse[None](success=False, message=message, errors=errors)


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated API response."""

    success: bool
    message: str
    data: list[T]
    total: int
    page: int
    per_page: int
    has_more: bool
