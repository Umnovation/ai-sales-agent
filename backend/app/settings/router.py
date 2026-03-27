from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from openai import APIConnectionError, AuthenticationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.common.schemas import ApiResponse
from app.dependencies import get_current_user, get_db
from app.settings import service as settings_service
from app.settings.schemas import (
    AvailableModelsResponse,
    CompanySettingsResponse,
    CompanySettingsUpdate,
    ContextCreate,
    ContextResponse,
    ContextUpdate,
    FetchModelsRequest,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _to_response(settings: object) -> CompanySettingsResponse:
    """Serialize settings without exposing the API key."""
    from app.settings.models import CompanySettings as CSModel

    s: CSModel = settings  # type: ignore[assignment]
    return CompanySettingsResponse(
        id=s.id,
        company_name=s.company_name,
        company_description=s.company_description,
        ai_provider=s.ai_provider,
        ai_model=s.ai_model,
        ai_api_key_set=bool(s.ai_api_key),
        ai_embedding_model=s.ai_embedding_model,
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


@router.get("")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[CompanySettingsResponse]:
    settings = await settings_service.get_settings(db)
    return ApiResponse.ok(data=_to_response(settings))


@router.put("")
async def update_settings(
    payload: CompanySettingsUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[CompanySettingsResponse]:
    settings = await settings_service.update_settings(db, payload)
    return ApiResponse.ok(
        data=_to_response(settings),
        message="Settings updated successfully",
    )


@router.post("/models")
async def fetch_models(
    payload: FetchModelsRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[AvailableModelsResponse]:
    api_key: str | None = payload.api_key
    if not api_key:
        settings = await settings_service.get_settings(db)
        api_key = settings.ai_api_key
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="No API key provided and no key is configured in settings.",
        )
    try:
        result: AvailableModelsResponse = await settings_service.fetch_available_models(api_key)
    except AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid API key.") from None
    except APIConnectionError:
        raise HTTPException(status_code=502, detail="Could not connect to OpenAI API.") from None
    return ApiResponse.ok(data=result)


@router.get("/contexts")
async def list_contexts(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[list[ContextResponse]]:
    contexts = await settings_service.list_contexts(db)
    return ApiResponse.ok(data=[ContextResponse.model_validate(c) for c in contexts])


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
