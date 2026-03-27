from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.provider import AIProvider
from app.ai.providers.openai_provider import OpenAIProvider
from app.auth.models import User
from app.auth.security import decode_access_token
from app.database import async_session_factory
from app.settings.models import CompanySettings

bearer_scheme = HTTPBearer()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    token: str = credentials.credentials
    user_id: int | None = decode_access_token(token)

    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    from app.auth.service import get_user_by_id

    user: User | None = await get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user


async def get_ai_provider(
    db: AsyncSession = Depends(get_db),
) -> AIProvider:
    """Build AI provider from CompanySettings stored in the database."""
    result = await db.execute(select(CompanySettings).limit(1))
    settings: CompanySettings | None = result.scalar_one_or_none()

    if settings is None or not settings.ai_api_key:
        raise HTTPException(
            status_code=400,
            detail="AI API key is not configured. Set it in Settings → General.",
        )

    return OpenAIProvider(
        api_key=settings.ai_api_key,
        model=settings.ai_model,
        embedding_model=settings.ai_embedding_model,
    )
