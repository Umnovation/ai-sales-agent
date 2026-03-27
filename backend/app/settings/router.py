from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.common.schemas import ApiResponse
from app.dependencies import get_current_user, get_db
from app.settings import service as settings_service
from app.settings.schemas import (
    CompanySettingsResponse,
    CompanySettingsUpdate,
    ContextCreate,
    ContextResponse,
    ContextUpdate,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[CompanySettingsResponse]:
    settings = await settings_service.get_settings(db)
    return ApiResponse.ok(data=CompanySettingsResponse.model_validate(settings))


@router.put("")
async def update_settings(
    payload: CompanySettingsUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[CompanySettingsResponse]:
    settings = await settings_service.update_settings(db, payload)
    return ApiResponse.ok(
        data=CompanySettingsResponse.model_validate(settings),
        message="Settings updated successfully",
    )


@router.get("/contexts")
async def list_contexts(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[list[ContextResponse]]:
    contexts = await settings_service.list_contexts(db)
    return ApiResponse.ok(
        data=[ContextResponse.model_validate(c) for c in contexts]
    )


@router.post("/contexts", status_code=201)
async def create_context(
    payload: ContextCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[ContextResponse]:
    context = await settings_service.create_context(db, payload)
    return ApiResponse.ok(
        data=ContextResponse.model_validate(context),
        message="Context created successfully",
    )


@router.put("/contexts/{context_id}")
async def update_context(
    context_id: int,
    payload: ContextUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[ContextResponse]:
    context = await settings_service.update_context(db, context_id, payload)
    return ApiResponse.ok(
        data=ContextResponse.model_validate(context),
        message="Context updated successfully",
    )


@router.delete("/contexts/{context_id}")
async def delete_context(
    context_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[None]:
    await settings_service.delete_context(db, context_id)
    return ApiResponse.ok(data=None, message="Context deleted successfully")
