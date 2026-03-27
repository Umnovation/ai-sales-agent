from __future__ import annotations

from typing import Protocol, runtime_checkable

from pydantic import BaseModel


@runtime_checkable
class AIProvider(Protocol):
    """Abstract interface for LLM providers."""

    async def generate(
        self,
        messages: list[dict[str, str]],
        system_prompt: str,
        temperature: float = 0.7,
    ) -> str:
        """Generate a text response from the LLM."""
        ...

    async def generate_structured[T: BaseModel](
        self,
        messages: list[dict[str, str]],
        system_prompt: str,
        response_schema: type[T],
        temperature: float = 0.3,
    ) -> T:
        """Generate a structured (JSON) response parsed into a Pydantic model."""
        ...

    async def validate_connection(self) -> None:
        """Check if the provider is reachable and API key is valid.

        Raises:
            Exception: If connection fails.
        """
        ...
