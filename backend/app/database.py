from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

_pool_kwargs: dict[str, int] = (
    {"pool_size": 10, "max_overflow": 20}
    if settings.database_url.startswith("postgresql")
    else {}
)

engine: AsyncEngine = create_async_engine(
    settings.database_url,
    echo=settings.database_echo,
    **_pool_kwargs,
)

async_session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()
