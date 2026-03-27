from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.settings.models import CompanySettings, Context
from app.settings.schemas import CompanySettingsUpdate, ContextCreate, ContextUpdate


async def get_settings(db: AsyncSession) -> CompanySettings:
    result = await db.execute(select(CompanySettings).limit(1))
    settings: CompanySettings | None = result.scalar_one_or_none()
    if settings is None:
        settings = CompanySettings()
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


async def update_settings(
    db: AsyncSession, payload: CompanySettingsUpdate
) -> CompanySettings:
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


async def update_context(
    db: AsyncSession, context_id: int, payload: ContextUpdate
) -> Context:
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
