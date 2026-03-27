from __future__ import annotations

from typing import Protocol, runtime_checkable

from openai import AsyncOpenAI

from app.config import settings


@runtime_checkable
class Embedder(Protocol):
    """Abstract interface for embedding providers."""

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of texts."""
        ...

    @property
    def dimensions(self) -> int:
        """Return the embedding dimensions."""
        ...


class OpenAIEmbedder:
    """OpenAI embeddings implementation."""

    def __init__(self) -> None:
        self._client: AsyncOpenAI = AsyncOpenAI(api_key=settings.openai_api_key)
        self._model: str = settings.openai_embedding_model
        self._dimensions: int = 1536

    async def embed(self, texts: list[str]) -> list[list[float]]:
        response = await self._client.embeddings.create(
            model=self._model,
            input=texts,
        )
        return [item.embedding for item in response.data]

    @property
    def dimensions(self) -> int:
        return self._dimensions
