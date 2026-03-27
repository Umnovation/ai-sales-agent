from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.chat.ws_manager import ws_manager
from app.common.exceptions import register_exception_handlers
from app.config import settings
from app.database import engine
from app.logging import setup_logging

logger: structlog.stdlib.BoundLogger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    setup_logging()
    logger.info("app_starting", env=settings.app_env)
    yield
    logger.info("app_shutting_down")
    await ws_manager.close_all(code=1001, reason="Server shutting down")
    await engine.dispose()


app = FastAPI(
    title="AI Sales Agent",
    description="Open-source AI sales agent with visual flow editor",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

# Routers
from app.analytics.router import router as analytics_router  # noqa: E402
from app.auth.router import router as auth_router  # noqa: E402
from app.chat.router import router as chat_router  # noqa: E402
from app.flow.router import router as flow_router  # noqa: E402
from app.flow.test_chat_router import router as test_chat_router  # noqa: E402
from app.health.router import router as health_router  # noqa: E402
from app.rag.router import router as rag_router  # noqa: E402
from app.settings.router import router as settings_router  # noqa: E402

app.include_router(analytics_router)
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(flow_router)
app.include_router(health_router)
app.include_router(rag_router)
app.include_router(settings_router)
app.include_router(test_chat_router)
