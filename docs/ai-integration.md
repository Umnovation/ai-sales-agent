# AI Integration

## Provider Protocol

```python
from typing import Protocol

class AIProvider(Protocol):
    async def generate(
        self,
        messages: list[dict[str, str]],
        system_prompt: str,
        temperature: float = 0.7,
    ) -> str: ...

    async def generate_structured[T: BaseModel](
        self,
        messages: list[dict[str, str]],
        system_prompt: str,
        response_schema: type[T],
        temperature: float = 0.3,
    ) -> T: ...
```

Default implementation: `OpenAIProvider` using `openai` SDK.
Contributors can add `AnthropicProvider`, `OllamaProvider`, etc.

## Embedder Protocol

```python
class Embedder(Protocol):
    async def embed(self, texts: list[str]) -> list[list[float]]: ...

    @property
    def dimensions(self) -> int: ...
```

Default: `OpenAIEmbedder` (text-embedding-3-small, 1536 dims).

## Structured Output Schemas

Step completion evaluation returns:
```json
{
  "is_step_finished": true,
  "finish_type": "success",
  "reason": "Client provided their budget range",
  "extracted_data": "Budget: $5000-10000/month"
}
```

Script transition evaluation returns:
```json
{
  "selected_script_id": 5,
  "reason": "Client expressed frustration about pricing",
  "confidence": 0.85
}
```

Minimum confidence for script transition: 0.7.

## Prompt Assembly (per step)

```
System prompt:
  - Company info (from CompanySettings)
  - Global rules and restrictions (from Context)
  - RAG context (relevant document chunks)
  - Current script name and description
  - Current step task
  - Current step completion criteria

Messages:
  - Full conversation history
  - Last user message
```

## Channel Abstraction

```python
class Channel(Protocol):
    async def send_message(self, chat_id: str, content: str) -> None: ...
    async def receive_message(self) -> IncomingMessage: ...
```

Default: `WebChatChannel` (built-in WebSocket).
Contributors can add `TelegramChannel`, `WhatsAppChannel`, etc.

All sources point to the single Flow.
