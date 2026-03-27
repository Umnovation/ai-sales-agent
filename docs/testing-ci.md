# Testing & CI/CD

## Backend Testing

- `pytest` with `pytest-asyncio` for async tests
- `httpx.AsyncClient` for API integration tests
- Test database: separate PostgreSQL database (or use transactions + rollback)
- Fixtures for Flow, Script, Step, Chat creation
- Mock AI provider for deterministic tests

### Critical Test Scenarios (FSM Engine)

These tests are required before shipping. They cover the non-obvious edge cases:

1. **Step completion → success routing** — step finishes with `finish_type=success`,
   routes to `success_step_id` (including cross-script routing)
2. **Step completion → fail routing** — step finishes with `finish_type=fail`,
   routes to `fail_step_id`
3. **Max attempts exceeded** — step reaches `max_attempts`, triggers fail routing
   even if completion criteria not evaluated
4. **Acceptance criteria triggers script switch** — mid-conversation, AI detects
   criteria match (confidence >= 0.7), switches to target script
5. **Acceptance criteria below threshold** — confidence < 0.7, stays on current script
6. **Operator takeover race condition** — operator clicks takeover while Celery
   worker is processing. Worker must check `is_controlled_by_bot` inside
   `FOR UPDATE` and abort if `False`
7. **Concurrent messages** — two messages arrive simultaneously, only one is processed
   (second sees updated state from first)

```python
# Example: test operator takeover race condition
async def test_operator_takeover_prevents_ai_response(
    db: AsyncSession,
    chat_with_active_flow: Chat,
    mock_ai_provider: MockAIProvider,
) -> None:
    chat = chat_with_active_flow

    await chat_service.toggle_bot_control(db, chat.id, is_bot=False)

    result: StepResult | None = await engine.process_message(
        db, chat.id, "I want to buy"
    )

    assert result is None
    assert mock_ai_provider.generate_call_count == 0
```

## Frontend Testing

- `vitest` for unit tests
- `@testing-library/react` for component tests
- MSW (Mock Service Worker) for API mocking

## CI/CD

GitHub Actions pipeline runs on every push and PR:

```yaml
# .github/workflows/ci.yml
jobs:
  backend:
    - ruff check app          # Linting
    - ruff format --check app # Formatting
    - mypy app --strict       # Type checking
    - pytest                  # Tests

  frontend:
    - npx tsc --noEmit        # Type checking
    - npx eslint src          # Linting
    - npx prettier --check src # Formatting
    - npx vitest run          # Tests
```

All checks must pass before merge. Badges in README.

## Error Handling & Retry Policy

### Celery Task Retry

All Celery tasks that call external services (LLM, embeddings) use retry with exponential backoff:

```python
@celery_app.task(
    bind=True,
    max_retries=3,
    autoretry_for=(AIProviderError, ConnectionError),
    retry_backoff=True,        # exponential: 1s, 2s, 4s
    retry_backoff_max=30,      # cap at 30 seconds
    retry_jitter=True,         # random jitter to prevent thundering herd
)
def process_ai_response(self: Task, chat_id: int, message_id: int) -> None:
    ...
```

### Failure Scenarios

| Scenario | Behavior |
|----------|----------|
| OpenAI returns 500/503 | Retry 3x with backoff. After 3 failures → dead letter queue |
| OpenAI returns 429 (rate limit) | Retry with `Retry-After` header value as delay |
| OpenAI returns 400 (bad request) | No retry (deterministic error). Log error, skip response |
| Redis connection lost | Celery reconnects automatically (built-in) |
| PostgreSQL connection lost | SQLAlchemy pool handles reconnection. Task retries |
| Embedding fails during RAG upload | Mark document as `status=error`. User can re-upload |

### Fallback Message

When all retries exhausted, send a fallback message so the visitor is not left hanging:

```python
@process_ai_response.on_failure
def on_task_failure(
    self: Task, exc: Exception, task_id: str, args: tuple, kwargs: dict, einfo: Any
) -> None:
    chat_id: int = args[0]
    fallback_message = "Sorry, I'm experiencing technical difficulties. A team member will follow up shortly."
    save_system_message(chat_id, fallback_message)
    broadcast_message(chat_id, fallback_message, sender_type="bot")
    logger.error("ai_response_failed", chat_id=chat_id, error=str(exc), task_id=task_id)
```
