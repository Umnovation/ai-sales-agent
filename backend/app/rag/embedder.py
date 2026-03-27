from __future__ import annotations

from typing import Protocol, runtime_checkable

from openai import AsyncOpenAI


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
    """OpenAI embeddings implementation.

    API key and model are provided at init time (from CompanySettings in DB).
    """

    def __init__(self, api_key: str, model: str = "text-embedding-3-small") -> None:
        self._client: AsyncOpenAI = AsyncOpenAI(api_key=api_key)
        self._model: str = model
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
