from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.common.schemas import ApiResponse


def register_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers for standardized API responses."""

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors: dict[str, list[str]] = {}
        for error in exc.errors():
            field_parts: list[str] = [
                str(loc) for loc in error["loc"] if str(loc) != "body"
            ]
            field: str = ".".join(field_parts) if field_parts else "general"
            errors.setdefault(field, []).append(str(error["msg"]))

        response = ApiResponse.error(message="Validation failed", errors=errors)
        return JSONResponse(
            status_code=422,
            content=response.model_dump(),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        _request: Request, exc: HTTPException
    ) -> JSONResponse:
        response = ApiResponse.error(message=str(exc.detail))
        return JSONResponse(
            status_code=exc.status_code,
            content=response.model_dump(),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        _request: Request, exc: Exception
    ) -> JSONResponse:
        import structlog

        logger: structlog.stdlib.BoundLogger = structlog.get_logger()
        logger.error("unhandled_exception", error=str(exc), exc_info=True)

        response = ApiResponse.error(message="Internal server error")
        return JSONResponse(
            status_code=500,
            content=response.model_dump(),
        )
