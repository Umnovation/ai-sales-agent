# AI Sales Agent

Open-source AI sales agent with a visual flow editor, inspired by [Dialogex](https://dialogex.io).

## Project Overview

AI-powered sales agent that guides conversations through configurable dialog flows.
The system uses a Finite State Machine (FSM) where:

- **Flow** is a single top-level entity (one per instance) containing multiple **Scripts**
- **Script** is a group of sequential **Steps** with optional acceptance criteria
- **Step** has a task (prompt for AI), completion criteria, max attempts, and success/fail routing
- AI evaluates each incoming message, checks global acceptance criteria, and either transitions to another script or continues the current step

### Core Concept

```
Incoming message
       |
       v
+----------------------+
| Check Acceptance     |  Check criteria of ALL scripts in flow.
| Criteria (Flow-wide) |  Triggered? -> switch current_script
+----------+-----------+
           |
           v
+----------------------+
| Resolve Active Step  |  Which step is active? Check:
|                      |  - Is current step completed (criteria met)?
|                      |  - Are attempts >= max_attempts?
|                      |  Yes -> apply routing (success/fail -> next step)
|                      |  No  -> stay on current step
+----------+-----------+
           |
           v
+----------------------+
| Execute Step (LLM)   |  Generate response using:
|                      |  - step.task (instruction)
|                      |  - step.completion_criteria
|                      |  - conversation history
|                      |  - RAG context (if available)
+----------+-----------+
           |
           v
+----------------------+
| Evaluate Completion  |  LLM checks: is completion_criteria met?
| & Update State       |  Update attempts, current_step, current_script
+----------------------+
```

### Key Simplifications vs Dialogex

- Single Flow per instance (all sources point to one flow)
- No multi-tenancy (single user, install script creates account)
- No CRM, billing, onboarding, follow-ups, triggers
- No i18n (English only for now)
- Python/FastAPI instead of PHP/Laravel
- React instead of Vue

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Backend    | FastAPI + SQLAlchemy (async) + Pydantic v2       |
| Worker     | Celery (Redis broker)                            |
| Database   | PostgreSQL + pgvector extension                  |
| Cache/MQ   | Redis                                            |
| Frontend   | React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| Flow Editor| React Flow                                       |
| Auth       | Simple token auth (install script creates user)  |
| AI         | OpenAI SDK (abstract Provider layer)             |
| RAG        | OpenAI Embeddings + pgvector (abstract Embedder) |
| Deploy     | Docker Compose (all-in-one)                      |

## Architecture

### Backend (FastAPI, domain-driven)

```
backend/
├── app/
│   ├── main.py                        # FastAPI app, lifespan, CORS, exception handlers
│   ├── config.py                      # pydantic-settings based config
│   ├── database.py                    # SQLAlchemy async engine, sessionmaker, Base
│   ├── dependencies.py                # FastAPI Depends (get_db, get_current_user, get_ai_provider)
│   │
│   ├── auth/                          # Domain: Authentication
│   │   ├── models.py                  # User model
│   │   ├── schemas.py                 # LoginRequest, TokenResponse
│   │   ├── router.py                  # POST /auth/login, POST /auth/install
│   │   ├── service.py                 # verify password, create token
│   │   └── security.py                # JWT/token utilities, password hashing
│   │
│   ├── flow/                          # Domain: Flow Engine
│   │   ├── models.py                  # Flow, FlowScript, FlowScriptStep
│   │   ├── schemas.py                 # Pydantic DTOs (create/update/response)
│   │   ├── router.py                  # CRUD endpoints for flow/scripts/steps
│   │   ├── service.py                 # CRUD + business logic
│   │   └── engine.py                  # FSM runtime:
│   │                                  #   - check_acceptance_criteria()
│   │                                  #   - resolve_active_step()
│   │                                  #   - execute_step()
│   │                                  #   - evaluate_completion()
│   │                                  #   - route_next_step()
│   │
│   ├── chat/                          # Domain: Chat & Messages
│   │   ├── models.py                  # Chat, Message, ChatFlowStepAttempt
│   │   ├── schemas.py                 # MessageCreate, ChatResponse, etc.
│   │   ├── router.py                  # REST endpoints + WebSocket endpoint
│   │   ├── service.py                 # Chat logic, operator takeover
│   │   ├── ws_manager.py             # WebSocket connection manager (broadcast)
│   │   └── tasks.py                   # Celery tasks:
│   │                                  #   - process_incoming_message
│   │                                  #   - process_ai_response
│   │
│   ├── ai/                            # Domain: AI Abstraction Layer
│   │   ├── provider.py                # AIProvider Protocol (abstract interface)
│   │   ├── providers/
│   │   │   ├── __init__.py
│   │   │   └── openai_provider.py     # OpenAI implementation
│   │   ├── prompts/                   # Prompt templates (XML files)
│   │   │   ├── generate_response.xml  # Main conversation prompt
│   │   │   ├── check_completion.xml   # Step completion evaluation
│   │   │   ├── check_transition.xml   # Script transition evaluation
│   │   │   └── loader.py             # XML prompt loader utility
│   │   └── schemas.py                 # Structured output schemas
│   │                                  #   (CompletionResult, TransitionResult)
│   │
│   ├── rag/                           # Domain: RAG (Retrieval-Augmented Generation)
│   │   ├── models.py                  # Document, DocumentChunk (with pgvector)
│   │   ├── schemas.py                 # DocumentUpload, ChunkResponse
│   │   ├── router.py                  # POST /documents/upload, GET /documents
│   │   ├── service.py                 # Upload, chunking, retrieval
│   │   └── embedder.py               # Embedder Protocol + OpenAI implementation
│   │
│   ├── channel/                       # Domain: Message Channel Abstraction
│   │   ├── base.py                    # Channel Protocol (send_message, receive)
│   │   ├── web_chat.py                # Built-in WebSocket-based web chat
│   │   └── registry.py               # Channel registry (for future extensions)
│   │
│   └── settings/                      # Domain: Company Settings
│       ├── models.py                  # CompanySettings, Context (rules/restrictions)
│       ├── schemas.py                 # SettingsUpdate, ContextCreate
│       ├── router.py                  # GET/PUT /settings, CRUD /contexts
│       └── service.py                 # Settings logic
│
├── alembic/                           # Database migrations
│   ├── versions/
│   └── env.py
├── alembic.ini
├── celery_app.py                      # Celery configuration
├── pyproject.toml                     # Dependencies + tool config
├── Dockerfile
└── .env.example
```

### Frontend (React, feature-based)

```
frontend/
├── src/
│   ├── main.tsx                       # Entry point
│   ├── App.tsx                        # Router + providers
│   │
│   ├── api/
│   │   ├── client.ts                  # Axios instance + interceptors (Bearer token)
│   │   ├── types/                     # Shared API response types
│   │   │   ├── flow.ts                # Flow, FlowScript, FlowScriptStep
│   │   │   ├── chat.ts                # Chat, Message
│   │   │   ├── settings.ts            # CompanySettings, Context
│   │   │   └── common.ts              # ApiResponse<T>, PaginatedResponse<T>
│   │   └── endpoints/
│   │       ├── flow.ts                # Flow CRUD
│   │       ├── scripts.ts             # Script CRUD
│   │       ├── steps.ts               # Step CRUD
│   │       ├── chat.ts                # Chat endpoints
│   │       ├── settings.ts            # Settings endpoints
│   │       ├── documents.ts           # RAG document endpoints
│   │       └── auth.ts                # Login endpoint
│   │
│   ├── features/
│   │   ├── flow-editor/
│   │   │   ├── components/
│   │   │   │   ├── FlowCanvas.tsx     # React Flow canvas with nodes/edges
│   │   │   │   ├── ScriptNode.tsx     # Custom node: script card with steps
│   │   │   │   ├── StepNode.tsx       # Step within script node
│   │   │   │   ├── FlowEdge.tsx       # Custom edge (success=green, fail=red dashed)
│   │   │   │   ├── TestChatDialog.tsx # In-editor test chat modal
│   │   │   │   └── panels/
│   │   │   │       ├── ScriptPanel.tsx    # Edit script (name, criteria, priority)
│   │   │   │       └── StepPanel.tsx      # Edit step (task, criteria, attempts, routing)
│   │   │   ├── hooks/
│   │   │   │   ├── useFlowEditor.ts       # Flow state management
│   │   │   │   └── useFlowConnections.ts  # Compute edges from step routing
│   │   │   └── FlowEditorPage.tsx
│   │   │
│   │   ├── chat/
│   │   │   ├── components/
│   │   │   │   ├── ChatList.tsx           # List of active chats
│   │   │   │   ├── ChatMessages.tsx       # Message history + input
│   │   │   │   ├── MessageBubble.tsx      # Single message rendering
│   │   │   │   └── MessageInput.tsx       # Text input + send button
│   │   │   ├── hooks/
│   │   │   │   └── useChatWebSocket.ts    # WS connection + message handling
│   │   │   └── ChatsPage.tsx
│   │   │
│   │   ├── settings/
│   │   │   ├── components/
│   │   │   │   ├── CompanyForm.tsx        # Company info fields
│   │   │   │   ├── ContextList.tsx        # Rules/restrictions list
│   │   │   │   ├── ContextForm.tsx        # Add/edit context
│   │   │   │   └── DocumentUpload.tsx     # RAG document upload
│   │   │   └── SettingsPage.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   │   ├── StatsCards.tsx         # Key metrics cards
│   │   │   │   └── ConversationChart.tsx  # Basic chart
│   │   │   └── DashboardPage.tsx
│   │   │
│   │   └── auth/
│   │       └── LoginPage.tsx
│   │
│   ├── shared/
│   │   ├── components/                # shadcn/ui components (Button, Dialog, etc.)
│   │   ├── hooks/
│   │   │   ├── useAuth.ts             # Auth state + token management
│   │   │   └── useWebSocket.ts        # Generic WS hook
│   │   ├── layouts/
│   │   │   └── DashboardLayout.tsx    # Sidebar + header + content
│   │   └── lib/
│   │       ├── utils.ts               # cn() helper, formatters
│   │       └── websocket.ts           # WS client class
│   │
│   └── styles/
│       └── globals.css                # Tailwind base + custom styles
│
├── public/
├── index.html
├── package.json
├── tsconfig.json                      # strict: true
├── vite.config.ts
└── tailwind.config.ts
```

### Docker Compose

```
docker-compose.yml
├── db         PostgreSQL 16 + pgvector extension
├── redis      Redis 7 (Celery broker + result backend)
├── backend    FastAPI (uvicorn, port 8000)
├── worker     Celery worker (same image as backend, different entrypoint)
├── frontend   React (nginx, port 3000)
```

## Data Models

### Flow Domain

```
Flow (single per instance)
├── id: int (PK)
├── name: str
├── description: str | None
├── is_active: bool (default: True)
├── created_at: datetime
├── updated_at: datetime
│
└── scripts: list[FlowScript]
    ├── id: int (PK)
    ├── flow_id: int (FK -> Flow)
    ├── name: str
    ├── description: str | None
    ├── transition_criteria: str | None      # Natural language criteria for AI
    │                                        # (e.g., "Client expresses negativity")
    │                                        # Checked on EVERY message across ALL scripts
    ├── is_starting_script: bool             # Entry point for new conversations
    ├── priority: int (default: 0)
    ├── position_x: float | None             # Canvas position for editor
    ├── position_y: float | None
    ├── created_at: datetime
    ├── updated_at: datetime
    │
    └── steps: list[FlowScriptStep]
        ├── id: int (PK)
        ├── flow_script_id: int (FK -> FlowScript)
        ├── order: int                           # Sequential order within script
        ├── title: str                           # Display name
        ├── task: str                            # Instruction for AI
        │                                        # (e.g., "Greet the client, introduce
        │                                        #  yourself as a CRM specialist...")
        ├── completion_criteria: str | None      # What counts as step completion
        │                                        # (e.g., "Client named a specific budget")
        ├── max_attempts: int (default: 2)       # Max AI evaluations for this step
        │                                        # (-1 = unlimited)
        ├── success_step_id: int | None (FK -> FlowScriptStep, self-ref)
        │                                        # Where to go on success
        │                                        # None = next step by order
        │                                        # Can point to step in ANOTHER script
        ├── fail_step_id: int | None (FK -> FlowScriptStep, self-ref)
        │                                        # Where to go on failure/max attempts
        │                                        # None = next step by order
        ├── created_at: datetime
        └── updated_at: datetime
```

### Chat Domain

```
Chat
├── id: int (PK)
├── source: str                          # Channel identifier (e.g., "web_chat", "telegram")
├── external_chat_id: str | None         # External ID for channel integration
├── flow_script_id: int | None (FK)      # Current active script
├── is_controlled_by_bot: bool (True)    # False = operator takeover
├── termination_reason: str | None       # Why bot stopped (operator_takeover,
│                                        #  user_negative, goal_achieved, etc.)
├── metadata: dict | None                # Visitor info, channel-specific data
├── created_at: datetime
├── updated_at: datetime
│
├── messages: list[Message]
│   ├── id: int (PK)
│   ├── chat_id: int (FK -> Chat)
│   ├── sender_type: str                 # "bot" | "user" | "visitor" | "system"
│   ├── content: str
│   ├── message_type: str (default: "text")  # "text" | "system_event"
│   ├── metadata: dict | None
│   ├── created_at: datetime
│   └── updated_at: datetime
│
└── step_attempts: list[ChatFlowStepAttempt]
    ├── id: int (PK)
    ├── chat_id: int (FK -> Chat)
    ├── flow_script_step_id: int (FK -> FlowScriptStep)
    │                                    # Unique constraint: (chat_id, flow_script_step_id)
    ├── attempts: int (default: 0)       # Number of AI evaluations
    ├── is_finished: bool (False)
    ├── finish_type: str | None          # "success" | "fail" | "skipped"
    ├── ai_result: dict | None           # { is_step_finished, finish_type,
    │                                    #   reason, extracted_data }
    ├── created_at: datetime
    └── updated_at: datetime
```

### Settings Domain

```
CompanySettings (single row)
├── id: int (PK)
├── company_name: str
├── company_description: str | None
├── ai_provider: str (default: "openai")
├── ai_model: str (default: "gpt-4o")
├── created_at: datetime
└── updated_at: datetime

Context
├── id: int (PK)
├── type: str                            # "rule" | "restriction"
│                                        # rule = flexible guideline for AI
│                                        # restriction = hard constraint
├── text: str                            # Natural language instruction
│                                        # (e.g., "Never discuss competitor pricing")
├── is_active: bool (True)
├── created_at: datetime
└── updated_at: datetime
```

### RAG Domain

```
Document
├── id: int (PK)
├── filename: str
├── file_type: str                       # "docx" | "pdf" | "txt"
├── file_size: int                       # bytes
├── chunk_count: int
├── created_at: datetime
└── updated_at: datetime

DocumentChunk
├── id: int (PK)
├── document_id: int (FK -> Document)
├── content: str                         # Chunk text
├── embedding: Vector(1536)              # pgvector column (OpenAI ada-002 = 1536 dims)
├── chunk_index: int                     # Order within document
├── metadata: dict | None                # Page number, section, etc.
├── created_at: datetime
└── updated_at: datetime
```

### Auth Domain

```
User (single user, created by install script)
├── id: int (PK)
├── email: str (unique)
├── password_hash: str
├── name: str
├── created_at: datetime
└── updated_at: datetime
```

## Transactional Integrity

### Isolation Level

PostgreSQL default `READ COMMITTED`. No need for `SERIALIZABLE`.

### Critical Sections

#### 1. Message Processing (Celery task)

Single transaction for the entire cycle. `SELECT ... FOR UPDATE` on Chat row:

```python
async with db.begin():
    chat = await session.execute(
        select(Chat).where(Chat.id == chat_id).with_for_update()
    )
    if not chat.is_controlled_by_bot:
        return  # operator took over, skip

    message = await save_message(chat_id, content)
    step_result = await engine.process(chat, message)
    await update_state(chat, step_result)
    bot_message = await save_message(chat_id, step_result.response, sender="bot")
# full commit or full rollback
```

#### 2. Operator Takeover

`FOR UPDATE` on Chat prevents race with Celery worker:

```python
async with db.begin():
    chat = await session.execute(
        select(Chat).where(Chat.id == chat_id).with_for_update()
    )
    chat.is_controlled_by_bot = False
    chat.termination_reason = "operator_takeover"
    await add_system_message(chat, "Operator took control")
```

#### 3. Concurrent Messages

Same `FOR UPDATE` on Chat + idempotency check by message_id prevents double processing.

#### 4. Flow Editor Batch Save

Standard transaction for batch step creation/update. Rollback if any step fails.

### Where Strict Isolation Is NOT Needed

- Dashboard analytics (read-only, eventual consistency OK)
- RAG document processing (idempotent, can restart)
- Settings updates (single user, no contention)

## AI Integration

### Provider Protocol

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

### Embedder Protocol

```python
class Embedder(Protocol):
    async def embed(self, texts: list[str]) -> list[list[float]]: ...

    @property
    def dimensions(self) -> int: ...
```

Default: `OpenAIEmbedder` (text-embedding-ada-002, 1536 dims).

### Structured Output Schemas

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

### Prompt Assembly (per step)

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

# In FSM engine — every decision is logged with context
async def process_message(chat: Chat, message: Message) -> StepResult:
    log = logger.bind(chat_id=chat.id, message_id=message.id)

    # Check acceptance criteria
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

    # Execute step
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

    # Evaluate completion
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

### Log Output Example

```json
{
  "event": "step_evaluated",
  "level": "info",
  "timestamp": "2026-03-27T12:34:56.789Z",
  "chat_id": 42,
  "message_id": 187,
  "step_id": 5,
  "is_finished": true,
  "finish_type": "success",
  "reason": "Client provided budget range: $5000-10000/month"
}
```

### What to Log

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
# app/health/router.py
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

    # OpenAI API (lightweight check — just verify API key is valid)
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

Response:
```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "ok" },
    "redis": { "status": "ok" },
    "ai_provider": { "status": "ok" }
  }
}
```

Used in Docker Compose healthcheck and monitoring.

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

## Pages

### 1. Dashboard (`/`)
- Total conversations count
- Active conversations
- Completion rate (how many reached final step)
- Basic chart (conversations over time)

### 2. Flow Editor (`/flow/edit`)
- React Flow canvas with script nodes
- Each script node contains its steps as a list
- Visual connections: green solid (success routing), red dashed (fail routing)
- Right panel: edit script or step properties
- Test Chat dialog: in-editor chat for testing the flow
- Script panel: name, description, transition_criteria (acceptance criteria)
- Step panel: title, task, completion_criteria, max_attempts, order, success/fail routing

### 3. Chats (`/chats`)
- Left sidebar: list of active chats with last message preview
- Main area: message history for selected chat
- Operator can send messages (automatically disables bot)
- Toggle button: enable/disable bot control
- System messages for state changes (bot disabled, script changed, etc.)

### 4. Settings (`/settings`)
- Company name, description
- AI provider selection, model selection
- Rules list (flexible guidelines for AI)
- Restrictions list (hard constraints)
- Document upload for RAG (docx, pdf, txt)
- List of uploaded documents with delete

## Code Standards

### Python (Backend)

STRICT TYPING. Equivalent to PHPStan level 10.

- ALL function parameters MUST have type annotations
- ALL return types MUST be explicitly declared
- ALL variables MUST have explicit types when not obvious from assignment
- Use `str`, `int`, `float`, `bool` — never `Any`
- Use `X | None` instead of `Optional[X]`
- Use `list[X]`, `dict[K, V]` — never bare `list`, `dict`
- Use Pydantic `BaseModel` for ALL data transfer — never raw dicts
- Use `TypeVar` and `Generic` where appropriate
- Use `Protocol` for abstract interfaces (not ABC)
- mypy strict mode must pass with zero errors
- Use `from __future__ import annotations` in every file

```python
# CORRECT
async def get_chat_by_id(session: AsyncSession, chat_id: int) -> Chat | None:
    result: Result[tuple[Chat]] = await session.execute(
        select(Chat).where(Chat.id == chat_id)
    )
    return result.scalar_one_or_none()

# WRONG - missing types, bare dict, Any
async def get_chat(session, chat_id):
    result = await session.execute(...)
    return result
```

Formatting and linting:
- `ruff` for linting and formatting (replaces black + isort + flake8)
- `mypy --strict` for type checking
- Line length: 100 characters

### TypeScript (Frontend)

STRICT TYPING. Zero tolerance for `any`.

tsconfig.json:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

Rules:
- NEVER use `any` — use `unknown` + type guards if type is truly unknown
- NEVER use `as` type assertions unless absolutely unavoidable (and add a comment why)
- ALL function parameters and return types MUST be explicitly typed
- ALL component props MUST use typed interfaces
- ALL API responses MUST have corresponding TypeScript types
- Use generics for reusable hooks and utilities
- Use discriminated unions for state management
- Use `readonly` for immutable data
- Use `Record<K, V>` instead of `{ [key: string]: V }`
- Use `satisfies` operator for type-safe object literals

```typescript
// CORRECT
interface StepPanelProps {
  readonly step: FlowScriptStep;
  readonly availableSteps: readonly FlowScriptStep[];
  onSave: (data: StepUpdateRequest) => Promise<void>;
}

function StepPanel({ step, availableSteps, onSave }: StepPanelProps): React.ReactElement {
  const [form, setForm] = useState<StepFormState>(() => mapStepToForm(step));
  // ...
}

// WRONG
function StepPanel({ step, availableSteps, onSave }: any) {
  const [form, setForm] = useState<any>({});
}
```

Formatting and linting:
- `eslint` with strict TypeScript rules
- `prettier` for formatting
- Naming: PascalCase for components/types, camelCase for functions/variables

### General Rules

- No dead code. If it's unused, delete it.
- No commented-out code.
- No TODO comments without a linked issue.
- No magic numbers — use named constants.
- Error messages must be descriptive and actionable.
- Every API endpoint must have Pydantic request/response schemas (backend) and TypeScript types (frontend).
- Every database query must use parameterized statements (SQLAlchemy handles this).
- No raw SQL strings unless absolutely necessary.

## Commands

### Development (without Docker)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Celery worker
celery -A celery_app worker --loglevel=info

# Frontend
cd frontend
npm install
npm run dev

# Type checking
cd backend && mypy app --strict
cd frontend && npx tsc --noEmit

# Linting
cd backend && ruff check app && ruff format app
cd frontend && npx eslint src && npx prettier --check src
```

### Production (Docker Compose)

```bash
docker compose up -d
docker compose exec backend python -m app.cli.install  # First-time setup
```

### Database Migrations

```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1
```

## API Response Format

All API endpoints return a standardized response envelope.

### Response Schema

```python
# backend/app/common/schemas.py
from pydantic import BaseModel
from typing import Generic, TypeVar

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    success: bool
    message: str
    data: T | None = None
    errors: dict[str, list[str]] | None = None
```

### Success Response

```json
{
  "success": true,
  "message": "Flow retrieved successfully",
  "data": {
    "id": 1,
    "name": "CRM Sales Flow",
    "scripts": [...]
  }
}
```

HTTP status codes: `200` (OK), `201` (Created).

### Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "name": ["Name is required"],
    "task": ["Task must be at least 10 characters"]
  }
}
```

HTTP status codes: `400` (Bad Request), `401` (Unauthorized), `403` (Forbidden), `404` (Not Found), `422` (Validation Error), `500` (Internal Server Error).

### Backend Usage

```python
from app.common.schemas import ApiResponse

@router.get("/flow")
async def get_flow(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[FlowResponse]:
    flow: Flow | None = await flow_service.get_active_flow(db)
    if flow is None:
        raise HTTPException(status_code=404, detail="Flow not found")
    return ApiResponse(
        success=True,
        message="",
        data=FlowResponse.model_validate(flow),
    )

@router.post("/flow/scripts", status_code=201)
async def create_script(
    payload: ScriptCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[ScriptResponse]:
    script: FlowScript = await flow_service.create_script(db, payload)
    return ApiResponse(
        success=True,
        message="Script created successfully",
        data=ScriptResponse.model_validate(script),
    )
```

### Error Handling (Backend)

Centralized exception handler converts all errors to ApiResponse format:

```python
# backend/app/common/exceptions.py
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors: dict[str, list[str]] = {}
    for error in exc.errors():
        field: str = ".".join(str(loc) for loc in error["loc"][1:])  # skip "body"
        errors.setdefault(field, []).append(str(error["msg"]))
    return JSONResponse(
        status_code=422,
        content=ApiResponse[None](
            success=False,
            message="Validation failed",
            errors=errors,
        ).model_dump(),
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(
    request: Request, exc: HTTPException
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=ApiResponse[None](
            success=False,
            message=str(exc.detail),
        ).model_dump(),
    )
```

### Frontend Types

```typescript
// frontend/src/api/types/common.ts
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly message: string;
  readonly data?: T;
  readonly errors?: Readonly<Record<string, readonly string[]>>;
}
```

### Frontend Usage

```typescript
// frontend/src/api/endpoints/flow.ts
import type { ApiResponse } from "@/api/types/common";
import type { Flow } from "@/api/types/flow";
import { apiClient } from "@/api/client";

export async function getFlow(): Promise<ApiResponse<Flow>> {
  const { data } = await apiClient.get<ApiResponse<Flow>>("/flow");
  return data;
}

export async function createScript(
  payload: ScriptCreateRequest
): Promise<ApiResponse<FlowScript>> {
  const { data } = await apiClient.post<ApiResponse<FlowScript>>(
    "/flow/scripts",
    payload
  );
  return data;
}
```

### Frontend Axios Interceptor (Error Handling)

```typescript
// frontend/src/api/client.ts
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const payload = error.response?.data;

    if (payload?.message) {
      error.message = payload.message;
    }

    if (error.response?.status === 401) {
      authStore.logout();
    }

    return Promise.reject(error);
  }
);
```

### Validation Errors in Forms

Frontend can map `errors` field directly to form fields:

```typescript
// Example: display validation errors per field
function handleSubmit(formData: StepFormData): void {
  try {
    await createStep(scriptId, formData);
  } catch (err) {
    const axiosError = err as AxiosError<ApiResponse<unknown>>;
    const fieldErrors = axiosError.response?.data?.errors;
    if (fieldErrors) {
      // fieldErrors = { "task": ["Task is required"], "order": ["Must be positive"] }
      setFormErrors(fieldErrors);
    }
  }
}
```

## API Endpoints

### Auth
- `POST /api/auth/login` — Login, returns token
- `POST /api/auth/install` — First-time user creation (only works if no users exist)

### Flow
- `GET /api/flow` — Get the single flow with all scripts and steps
- `PUT /api/flow` — Update flow metadata

### Scripts
- `POST /api/flow/scripts` — Create script
- `PUT /api/flow/scripts/{id}` — Update script
- `DELETE /api/flow/scripts/{id}` — Delete script
- `PATCH /api/flow/scripts/{id}/position` — Update canvas position

### Steps
- `POST /api/flow/scripts/{script_id}/steps` — Create step
- `PUT /api/flow/scripts/{script_id}/steps/{id}` — Update step
- `DELETE /api/flow/scripts/{script_id}/steps/{id}` — Delete step
- `PATCH /api/flow/scripts/{script_id}/steps/reorder` — Reorder steps

### Chat
- `GET /api/chats` — List all chats (paginated)
- `GET /api/chats/{id}` — Get chat with messages
- `POST /api/chats/{id}/messages` — Operator sends message (disables bot)
- `PATCH /api/chats/{id}/bot-control` — Toggle bot on/off
- `WS /ws/chat/{id}` — WebSocket for real-time messages

### Chat (Public — for web chat widget / external channels)
- `POST /api/public/chat/init` — Initialize new chat session
- `POST /api/public/chat/{id}/message` — Visitor sends message

### Settings
- `GET /api/settings` — Get company settings
- `PUT /api/settings` — Update company settings
- `GET /api/settings/contexts` — List rules and restrictions
- `POST /api/settings/contexts` — Create context
- `PUT /api/settings/contexts/{id}` — Update context
- `DELETE /api/settings/contexts/{id}` — Delete context

### Documents (RAG)
- `GET /api/documents` — List uploaded documents
- `POST /api/documents/upload` — Upload document (docx, pdf, txt)
- `DELETE /api/documents/{id}` — Delete document and its chunks

### Dashboard
- `GET /api/analytics/summary` — Aggregate stats (total chats, active, completion rate)
- `GET /api/analytics/conversations` — Conversations over time (for chart)

### Test Chat (for flow editor)
- `POST /api/flow/test-chat` — Create test chat session
- `POST /api/flow/test-chat/{id}/message` — Send message in test chat
- `DELETE /api/flow/test-chat/{id}` — Delete test chat

## Testing

### Backend

- `pytest` with `pytest-asyncio` for async tests
- `httpx.AsyncClient` for API integration tests
- Test database: separate PostgreSQL database (or use transactions + rollback)
- Fixtures for Flow, Script, Step, Chat creation
- Mock AI provider for deterministic tests

#### Critical Test Scenarios (FSM Engine)

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

    # Simulate operator takeover
    await chat_service.toggle_bot_control(db, chat.id, is_bot=False)

    # Simulate Celery task processing (should abort)
    result: StepResult | None = await engine.process_message(
        db, chat.id, "I want to buy"
    )

    assert result is None  # No AI response generated
    assert mock_ai_provider.generate_call_count == 0  # LLM never called
```

### Frontend

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
| OpenAI returns 500/503 | Retry 3x with backoff. After 3 failures → task moves to dead letter queue |
| OpenAI returns 429 (rate limit) | Retry with `Retry-After` header value as delay |
| OpenAI returns 400 (bad request) | No retry (deterministic error). Log error, skip response |
| Redis connection lost | Celery reconnects automatically (built-in) |
| PostgreSQL connection lost | SQLAlchemy pool handles reconnection. Task retries |
| Embedding fails during RAG upload | Mark document as `status=error`. User can re-upload |

### Fallback Message

When all retries exhausted, send a fallback message to the chat so the visitor
is not left hanging:

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

## Pagination

All list endpoints use cursor/offset pagination with a standard response format.

### Response Format

```python
class PaginatedResponse(BaseModel, Generic[T]):
    success: bool
    message: str
    data: list[T]
    total: int
    page: int
    per_page: int
    has_more: bool
```

```json
{
  "success": true,
  "message": "",
  "data": [...],
  "total": 150,
  "page": 1,
  "per_page": 20,
  "has_more": true
}
```

### Frontend Type

```typescript
export interface PaginatedResponse<T> {
  readonly success: boolean;
  readonly message: string;
  readonly data: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly per_page: number;
  readonly has_more: boolean;
}
```

### Paginated Endpoints

| Endpoint | Default per_page | Max per_page |
|----------|-----------------|--------------|
| `GET /api/chats` | 20 | 50 |
| `GET /api/chats/{id}/messages` | 50 | 100 |
| `GET /api/documents` | 20 | 50 |
| `GET /api/analytics/conversations` | 30 | 90 |

Query parameters: `?page=1&per_page=20`

## Database Indexes

### Required Indexes

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

### Why HNSW over IVFFlat for pgvector

HNSW provides better recall at similar speed and does not require a separate training step.
For the expected document count (hundreds, not millions), HNSW is the right choice.
IVFFlat is better for 1M+ vectors where build time matters.

## Security

### Authentication

- Password hashing: `bcrypt` via `passlib[bcrypt]`
- Token: JWT with configurable expiration (default: 7 days)
- Token stored in `localStorage` on frontend (acceptable for single-user app)
- Every protected endpoint requires `Authorization: Bearer <token>` header

### Input Validation

- All input validated by Pydantic models (backend) — no raw dict access
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
# celery_app.py
app.conf.update(
    worker_shutdown_timeout=30,          # Wait up to 30s for current task to finish
    worker_cancel_long_running_tasks_on_connection_loss=False,
    task_acks_late=True,                 # Acknowledge task AFTER completion
    task_reject_on_worker_lost=True,     # Re-queue task if worker crashes
)
```

On `docker compose down` or `SIGTERM`:
1. Worker stops accepting new tasks
2. Current task runs to completion (up to 30s timeout)
3. If task doesn't finish in 30s → `SIGKILL`, task re-queued (because `acks_late`)

### FastAPI

```python
# app/main.py
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    logger.info("app_starting")
    yield
    # Shutdown
    logger.info("app_shutting_down")
    await ws_manager.close_all(code=1001, reason="Server shutting down")
    await engine.dispose()  # Close DB connections
```

### WebSocket Reconnection (Frontend)

```typescript
// frontend/src/shared/lib/websocket.ts
const WS_RECONNECT_DELAYS: readonly number[] = [1000, 2000, 4000, 8000, 15000];

function connect(chatId: number): void {
  const ws = new WebSocket(`${WS_URL}/ws/chat/${chatId}`);

  ws.onclose = (event: CloseEvent) => {
    if (event.code !== 1000) {  // 1000 = normal close
      const delay = WS_RECONNECT_DELAYS[Math.min(attempt, WS_RECONNECT_DELAYS.length - 1)];
      setTimeout(() => connect(chatId), delay);
      attempt++;
    }
  };

  ws.onopen = () => {
    attempt = 0;  // Reset on successful connection
  };
}
```

Auto-reconnect with exponential backoff (1s → 2s → 4s → 8s → 15s cap).
Resets attempt counter on successful connection.

## Environment Variables

### .env.example

```env
# ============================================
# Application
# ============================================
APP_ENV=development                        # development | production
APP_DEBUG=true                             # Enable debug mode (disable in production)
APP_SECRET_KEY=change-me-to-random-string  # Used for JWT signing

# ============================================
# Database (PostgreSQL)
# ============================================
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/ai_sales_agent
DATABASE_ECHO=false                        # Log all SQL queries (development only)

# ============================================
# Redis
# ============================================
REDIS_URL=redis://redis:6379/0

# ============================================
# AI Provider
# ============================================
AI_PROVIDER=openai                         # openai (extensible to anthropic, ollama)
OPENAI_API_KEY=sk-...                      # Required
OPENAI_MODEL=gpt-4o                        # Model for conversation + evaluation
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Model for RAG embeddings

# ============================================
# CORS
# ============================================
CORS_ORIGINS=["http://localhost:3000"]     # Frontend URL(s)

# ============================================
# Auth
# ============================================
JWT_EXPIRATION_DAYS=7                      # Token TTL

# ============================================
# File Upload
# ============================================
UPLOAD_DIR=./uploads                       # Directory for uploaded documents
MAX_UPLOAD_SIZE_MB=10                      # Max file size in megabytes

# ============================================
# Celery
# ============================================
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2
```

## Makefile

```makefile
.PHONY: dev test lint migrate install clean

# Development
dev:                           ## Start all services
	docker compose up -d
	docker compose logs -f backend worker

# Testing
test:                          ## Run all tests
	cd backend && pytest -v
	cd frontend && npx vitest run

test-backend:                  ## Run backend tests only
	cd backend && pytest -v

test-frontend:                 ## Run frontend tests only
	cd frontend && npx vitest run

# Linting & Type Checking
lint:                          ## Run all linters
	cd backend && ruff check app && ruff format --check app && mypy app --strict
	cd frontend && npx tsc --noEmit && npx eslint src && npx prettier --check src

lint-fix:                      ## Auto-fix linting issues
	cd backend && ruff check app --fix && ruff format app
	cd frontend && npx eslint src --fix && npx prettier --write src

# Database
migrate:                       ## Run database migrations
	cd backend && alembic upgrade head

migrate-new:                   ## Create new migration
	@read -p "Migration name: " name; \
	cd backend && alembic revision --autogenerate -m "$$name"

# Setup
install:                       ## First-time setup (creates user, runs migrations)
	docker compose exec backend python -m app.cli.install

# Cleanup
clean:                         ## Stop and remove all containers + volumes
	docker compose down -v

help:                          ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' Makefile | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
```

## OpenAPI Documentation

FastAPI auto-generates interactive API documentation:

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **OpenAPI JSON:** `http://localhost:8000/openapi.json`

All endpoints, request/response schemas, and authentication requirements are
automatically documented from Pydantic models and FastAPI route definitions.
No manual documentation maintenance needed.

## README Structure

The README.md must include these sections in order:

1. **Title + badges** — CI status, license, Python/Node versions
2. **One-line description** — "AI-powered sales agent with a visual flow editor"
3. **Screenshot/GIF** — working flow editor + chat (record after MVP is done)
4. **Features** — bullet list of key capabilities
5. **Quick Start** — `git clone` → `cp .env.example .env` → `docker compose up` → `make install` → open browser
6. **Architecture** — mermaid diagram showing services (FastAPI ↔ Celery ↔ Redis ↔ PostgreSQL, React ↔ FastAPI)
7. **Tech Stack** — table with versions
8. **Project Structure** — abbreviated tree
9. **Development** — how to run locally without Docker
10. **Contributing** — link to CONTRIBUTING.md
11. **License** — MIT
12. **Acknowledgments** — "Inspired by [Dialogex](https://dialogex.io)"

## Contributing Guide

CONTRIBUTING.md must include:

1. **Prerequisites** — Python 3.12+, Node 20+, Docker, PostgreSQL 16
2. **Development Setup** — step-by-step local setup
3. **Code Standards** — link to CLAUDE.md Code Standards section
4. **Branch Naming** — `feature/short-description`, `fix/short-description`
5. **Commit Messages** — conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`)
6. **PR Process** — create branch → make changes → run `make lint` → run `make test` → open PR
7. **Adding a New AI Provider** — how to implement `AIProvider` Protocol
8. **Adding a New Channel** — how to implement `Channel` Protocol

## License

MIT License. Full text in `LICENSE` file.
