"""Test fixtures for backend tests."""
from __future__ import annotations

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.ai.provider import AIProvider
from app.ai.schemas import CompletionResult, TransitionResult
from app.database import Base, get_db
from app.dependencies import get_ai_provider
from app.main import app

# Use SQLite for tests (in-memory)
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
test_session_factory = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


class MockAIProvider:
    """Deterministic AI provider for tests."""

    def __init__(self) -> None:
        self.generate_call_count: int = 0
        self.generate_structured_call_count: int = 0
        self.generate_response: str = "Hello! How can I help you today?"
        self.completion_result: CompletionResult = CompletionResult(
            is_step_finished=False,
            finish_type=None,
            reason="Step not yet completed",
            extracted_data=None,
        )
        self.transition_result: TransitionResult = TransitionResult(
            selected_script_id=None,
            reason="No transition needed",
            confidence=0.3,
        )

    async def generate(
        self,
        messages: list[dict[str, str]],
        system_prompt: str,
        temperature: float = 0.7,
    ) -> str:
        self.generate_call_count += 1
        return self.generate_response

    async def generate_structured[T: BaseModel](
        self,
        messages: list[dict[str, str]],
        system_prompt: str,
        response_schema: type[T],
        temperature: float = 0.3,
    ) -> T:
        self.generate_structured_call_count += 1
        if response_schema == CompletionResult:
            return self.completion_result  # type: ignore[return-value]
        if response_schema == TransitionResult:
            return self.transition_result  # type: ignore[return-value]
        raise ValueError(f"Unknown schema: {response_schema}")

    async def validate_connection(self) -> None:
        pass


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    """Create test database tables and provide a session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with test_session_factory() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
def mock_ai() -> MockAIProvider:
    """Provide a mock AI provider with configurable responses."""
    return MockAIProvider()


@pytest_asyncio.fixture
async def client(
    db: AsyncSession, mock_ai: MockAIProvider
) -> AsyncGenerator[AsyncClient, None]:
    """Provide an HTTP test client with overridden dependencies."""

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db

    def override_get_ai_provider() -> AIProvider:
        return mock_ai  # type: ignore[return-value]

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_ai_provider] = override_get_ai_provider

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_token(client: AsyncClient) -> str:
    """Create a user via install and return auth token."""
    response = await client.post(
        "/api/auth/install",
        json={"email": "test@test.com", "password": "test123456", "name": "Test User"},
    )
    data: dict[str, object] = response.json()
    token_data: dict[str, object] = data.get("data", {})  # type: ignore[assignment]
    return str(token_data.get("token", ""))


@pytest.fixture
def auth_headers(auth_token: str) -> dict[str, str]:
    """Provide authorization headers."""
    return {"Authorization": f"Bearer {auth_token}"}
