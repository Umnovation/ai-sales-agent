from __future__ import annotations

from fastapi import HTTPException
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.settings.models import CompanySettings, Context
from app.settings.schemas import (
    AvailableModelsResponse,
    CompanySettingsUpdate,
    ContextCreate,
    ContextUpdate,
    ModelInfo,
)

CHAT_MODEL_PREFIXES: tuple[str, ...] = (
    "gpt-5",
    "gpt-4",
    "gpt-3.5",
    "o1",
    "o3",
    "o4",
    "chatgpt",
)
EMBEDDING_MODEL_PREFIXES: tuple[str, ...] = ("text-embedding",)
EXCLUDED_SUFFIXES: tuple[str, ...] = (
    "-realtime",
    "-audio",
    "-search",
    "-similarity",
    "-code",
)


async def fetch_available_models(api_key: str) -> AvailableModelsResponse:
    """Fetch available models from OpenAI API and filter into chat/embedding."""
    client: AsyncOpenAI = AsyncOpenAI(api_key=api_key)
    response = await client.models.list()

    chat_models: list[ModelInfo] = []
    embedding_models: list[ModelInfo] = []

    for model in response.data:
        model_id: str = model.id
        lower_id: str = model_id.lower()

        if any(lower_id.endswith(suf) for suf in EXCLUDED_SUFFIXES):
            continue

        if any(lower_id.startswith(p) for p in CHAT_MODEL_PREFIXES):
            chat_models.append(ModelInfo(id=model_id, name=model_id))
        elif any(lower_id.startswith(p) for p in EMBEDDING_MODEL_PREFIXES):
            embedding_models.append(ModelInfo(id=model_id, name=model_id))

    chat_models.sort(key=lambda m: m.id, reverse=True)
    embedding_models.sort(key=lambda m: m.id, reverse=True)

    return AvailableModelsResponse(
        chat_models=chat_models,
        embedding_models=embedding_models,
    )


async def get_settings(db: AsyncSession) -> CompanySettings:
    result = await db.execute(select(CompanySettings).limit(1))
    settings: CompanySettings | None = result.scalar_one_or_none()
    if settings is None:
        settings = CompanySettings()
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


async def update_settings(db: AsyncSession, payload: CompanySettingsUpdate) -> CompanySettings:
    settings: CompanySettings = await get_settings(db)
    update_data: dict[str, object] = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)
    await db.commit()
    await db.refresh(settings)
    return settings


async def list_contexts(db: AsyncSession) -> list[Context]:
    result = await db.execute(select(Context).order_by(Context.id))
    return list(result.scalars().all())


async def create_context(db: AsyncSession, payload: ContextCreate) -> Context:
    context = Context(**payload.model_dump())
    db.add(context)
    await db.commit()
    await db.refresh(context)
    return context


async def get_context_by_id(db: AsyncSession, context_id: int) -> Context:
    result = await db.execute(select(Context).where(Context.id == context_id))
    context: Context | None = result.scalar_one_or_none()
    if context is None:
        raise HTTPException(status_code=404, detail="Context not found")
    return context


async def update_context(db: AsyncSession, context_id: int, payload: ContextUpdate) -> Context:
    context: Context = await get_context_by_id(db, context_id)
    update_data: dict[str, object] = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(context, field, value)
    await db.commit()
    await db.refresh(context)
    return context


async def delete_context(db: AsyncSession, context_id: int) -> None:
    context: Context = await get_context_by_id(db, context_id)
    await db.delete(context)
    await db.commit()
