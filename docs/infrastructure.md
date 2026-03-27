# Infrastructure

## Middleware

### CORS

Configured via environment variable. FastAPI built-in `CORSMiddleware`:

```python
# app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,  # from env: CORS_ORIGINS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

```env
# .env
CORS_ORIGINS=["http://localhost:3000"]
# Production: CORS_ORIGINS=["https://yourdomain.com"]
```

### Rate Limiting

Using `slowapi` with Redis backend (Redis already in stack for Celery).

Rate limits apply to **public endpoints only** (protected endpoints have single user, no need):

| Endpoint | Limit | Why |
|----------|-------|-----|
| `POST /api/public/chat/{id}/message` | 10/minute per IP | Prevent message spam + runaway LLM costs |
| `POST /api/public/chat/init` | 5/minute per IP | Prevent chat session flooding |
| `POST /api/auth/login` | 5/minute per IP | Brute force protection |

```python
# app/main.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.redis_url,
    default_limits=[],  # no global limit, only per-endpoint
)
app.state.limiter = limiter

# app/chat/router.py
@router.post("/api/public/chat/{chat_id}/message")
@limiter.limit("10/minute")
async def public_send_message(
    request: Request, chat_id: int, payload: PublicMessageRequest
) -> ApiResponse[MessageResponse]:
    ...
```

Rate limit exceeded returns `429 Too Many Requests` in standard ApiResponse format:
```json
{
  "success": false,
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "errors": null
}
```

## Structured Logging

All logging uses `structlog` with JSON output. Every log entry includes context fields
for filtering and debugging.

### Configuration

```python
# app/logging.py
import structlog

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
)
```

### Usage Pattern

```python
import structlog

logger: structlog.stdlib.BoundLogger = structlog.get_logger()

async def process_message(chat: Chat, message: Message) -> StepResult:
    log = logger.bind(chat_id=chat.id, message_id=message.id)

    transition = await check_acceptance_criteria(flow, chat, message)
    if transition is not None:
        log.info(
            "script_transition",
            from_script_id=chat.flow_script_id,
            to_script_id=transition.selected_script_id,
            reason=transition.reason,
            confidence=transition.confidence,
        )
        await switch_script(chat, transition.selected_script_id)

    step = await resolve_active_step(chat)
    log.info("step_executing", step_id=step.id, step_title=step.title, attempt=attempt)

    start = time.monotonic()
    response = await ai_provider.generate(messages, system_prompt)
    latency_ms = int((time.monotonic() - start) * 1000)

    log.info(
        "llm_call_completed",
        step_id=step.id,
        latency_ms=latency_ms,
        prompt_tokens=usage.prompt_tokens,
        completion_tokens=usage.completion_tokens,
    )

    result = await evaluate_completion(step, history)
    log.info(
        "step_evaluated",
        step_id=step.id,
        is_finished=result.is_step_finished,
        finish_type=result.finish_type,
        reason=result.reason,
    )

    return result
```

### Log Events

| Event | Level | When |
|-------|-------|------|
| `message_received` | info | Incoming message from any channel |
| `script_transition` | info | Acceptance criteria triggered script switch |
| `step_executing` | info | Before LLM call for step |
| `llm_call_completed` | info | After LLM call (with latency + tokens) |
| `step_evaluated` | info | After completion check (with result) |
| `step_routed` | info | Step finished, routing to next step |
| `operator_takeover` | info | Operator disabled bot |
| `bot_resumed` | info | Operator re-enabled bot |
| `celery_task_failed` | error | Celery task exception (with traceback) |
| `ai_provider_error` | error | LLM API error (with status code) |

## Health Check

`GET /health` — checks all critical dependencies. No authentication required.

```python
@router.get("/health")
async def health_check(
    db: AsyncSession = Depends(get_db),
) -> HealthResponse:
    checks: dict[str, ComponentHealth] = {}

    # PostgreSQL
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = ComponentHealth(status="ok")
    except Exception as e:
        checks["database"] = ComponentHealth(status="error", detail=str(e))

    # Redis
    try:
        redis = get_redis()
        await redis.ping()
        checks["redis"] = ComponentHealth(status="ok")
    except Exception as e:
        checks["redis"] = ComponentHealth(status="error", detail=str(e))

    # OpenAI API
    try:
        await ai_provider.validate_connection()
        checks["ai_provider"] = ComponentHealth(status="ok")
    except Exception as e:
        checks["ai_provider"] = ComponentHealth(status="error", detail=str(e))

    all_ok: bool = all(c.status == "ok" for c in checks.values())

    return HealthResponse(
        status="healthy" if all_ok else "degraded",
        checks=checks,
    )
```

## WebSocket

### Backend -> Frontend (real-time updates)

FastAPI native WebSocket at `/ws/chat/{chat_id}`.

Events:
- `message.sent` — new message in chat (from bot, visitor, or operator)
- `chat.updated` — chat state change (bot control toggle, script transition)
- `typing` — typing indicator

### Connection Manager

Manages active WebSocket connections. Broadcasts events to all connected clients
for a given chat_id. Used by both the admin chat page and the test chat in flow editor.

### Frontend Reconnection

```typescript
const WS_RECONNECT_DELAYS: readonly number[] = [1000, 2000, 4000, 8000, 15000];

function connect(chatId: number): void {
  const ws = new WebSocket(`${WS_URL}/ws/chat/${chatId}`);

  ws.onclose = (event: CloseEvent) => {
    if (event.code !== 1000) {
      const delay = WS_RECONNECT_DELAYS[Math.min(attempt, WS_RECONNECT_DELAYS.length - 1)];
      setTimeout(() => connect(chatId), delay);
      attempt++;
    }
  };

  ws.onopen = () => {
    attempt = 0;
  };
}
```

Auto-reconnect with exponential backoff (1s → 2s → 4s → 8s → 15s cap).

## Database Indexes

```sql
-- Messages: fetch chat history (most frequent query)
CREATE INDEX idx_messages_chat_id_created_at ON messages (chat_id, created_at);

-- Step attempts: lookup by chat + step (unique constraint acts as index)
CREATE UNIQUE INDEX idx_step_attempts_chat_step
    ON chat_flow_step_attempts (chat_id, flow_script_step_id);

-- Chats: list by update time (chat list sorted by recent activity)
CREATE INDEX idx_chats_updated_at ON chats (updated_at DESC);

-- Document chunks: vector similarity search (pgvector HNSW index)
CREATE INDEX idx_chunks_embedding ON document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Flow script steps: ordering within script
CREATE INDEX idx_steps_script_order ON flow_script_steps (flow_script_id, "order");
```

Why HNSW over IVFFlat: better recall, no training step. For expected document count (hundreds, not millions), HNSW is the right choice.

## Security

### Authentication

- Password hashing: `bcrypt` via `passlib[bcrypt]`
- Token: JWT with configurable expiration (default: 7 days)
- Token stored in `localStorage` on frontend (acceptable for single-user app)
- Every protected endpoint requires `Authorization: Bearer <token>` header

### Input Validation

- All input validated by Pydantic models — no raw dict access
- SQLAlchemy parameterized queries — no SQL injection possible
- React JSX auto-escapes — no XSS via rendered content
- File upload: validate MIME type + extension + max size before processing

### File Upload Limits

| Constraint | Value |
|-----------|-------|
| Max file size | 10 MB |
| Allowed types | `.docx`, `.pdf`, `.txt` |
| MIME validation | Checked server-side, not just extension |
| Storage | Local filesystem (`uploads/` directory) |

```python
ALLOWED_UPLOAD_TYPES: Final[set[str]] = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}
MAX_UPLOAD_SIZE_BYTES: Final[int] = 10 * 1024 * 1024  # 10 MB
```

### Secrets Management

- All secrets via environment variables (never hardcoded)
- `.env` files in `.gitignore`
- `.env.example` provided with placeholder values
- Docker Compose uses `env_file` directive

## Graceful Shutdown

### Celery Worker

```python
app.conf.update(
    worker_shutdown_timeout=30,
    worker_cancel_long_running_tasks_on_connection_loss=False,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
)
```

On `docker compose down` or `SIGTERM`:
1. Worker stops accepting new tasks
2. Current task runs to completion (up to 30s timeout)
3. If task doesn't finish in 30s → `SIGKILL`, task re-queued (because `acks_late`)

### FastAPI

```python
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("app_starting")
    yield
    logger.info("app_shutting_down")
    await ws_manager.close_all(code=1001, reason="Server shutting down")
    await engine.dispose()
```

## Environment Variables

```env
# Application
APP_ENV=development                        # development | production
APP_DEBUG=true
APP_SECRET_KEY=change-me-to-random-string  # Used for JWT signing

# Database (PostgreSQL)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/ai_sales_agent
DATABASE_ECHO=false                        # Log all SQL queries (development only)

# Redis
REDIS_URL=redis://redis:6379/0

# AI Provider
AI_PROVIDER=openai                         # openai (extensible to anthropic, ollama)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# CORS
CORS_ORIGINS=["http://localhost:3000"]

# Auth
JWT_EXPIRATION_DAYS=7

# File Upload
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=10

# Celery
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2
```
