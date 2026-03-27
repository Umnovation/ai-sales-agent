from __future__ import annotations

import json
import time

import structlog
from openai import AsyncOpenAI
from pydantic import BaseModel

from app.config import settings

logger: structlog.stdlib.BoundLogger = structlog.get_logger()


class OpenAIProvider:
    """OpenAI API implementation of AIProvider protocol."""

    def __init__(self) -> None:
        self._client: AsyncOpenAI = AsyncOpenAI(api_key=settings.openai_api_key)
        self._model: str = settings.openai_model

    async def generate(
        self,
        messages: list[dict[str, str]],
        system_prompt: str,
        temperature: float = 0.7,
    ) -> str:
        all_messages: list[dict[str, str]] = [
            {"role": "system", "content": system_prompt},
            *messages,
        ]

        start: float = time.monotonic()
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=all_messages,  # type: ignore[arg-type]
            temperature=temperature,
        )
        latency_ms: int = int((time.monotonic() - start) * 1000)

        content: str = response.choices[0].message.content or ""
        usage = response.usage

        logger.info(
            "llm_call_completed",
            model=self._model,
            latency_ms=latency_ms,
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
        )

        return content

    async def generate_structured[T: BaseModel](
        self,
        messages: list[dict[str, str]],
        system_prompt: str,
        response_schema: type[T],
        temperature: float = 0.3,
    ) -> T:
        schema: dict[str, object] = response_schema.model_json_schema()

        all_messages: list[dict[str, str]] = [
            {"role": "system", "content": system_prompt},
            *messages,
        ]

        start: float = time.monotonic()
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=all_messages,  # type: ignore[arg-type]
            temperature=temperature,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": response_schema.__name__,
                    "schema": schema,
                    "strict": True,
                },
            },
        )
        latency_ms: int = int((time.monotonic() - start) * 1000)

        content: str = response.choices[0].message.content or "{}"
        usage = response.usage

        logger.info(
            "llm_structured_call_completed",
            model=self._model,
            schema=response_schema.__name__,
            latency_ms=latency_ms,
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
        )

        parsed: dict[str, object] = json.loads(content)
        return response_schema.model_validate(parsed)

    async def validate_connection(self) -> None:
        await self._client.models.list()
