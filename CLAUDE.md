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

## Project Structure

```
backend/app/
├── auth/          # Authentication (JWT, login, install)
├── flow/          # Flow engine (FSM runtime, CRUD, scripts, steps)
├── chat/          # Chat & messages (REST, WebSocket, Celery tasks)
├── ai/            # AI abstraction (Provider protocol, prompts as XML)
├── rag/           # RAG (document upload, chunking, pgvector search)
├── channel/       # Channel abstraction (WebSocket, extensible)
├── settings/      # Company settings, rules, restrictions
├── common/        # Shared schemas (ApiResponse), exceptions
├── main.py        # FastAPI app, lifespan, CORS, exception handlers
├── config.py      # pydantic-settings based config
├── database.py    # SQLAlchemy async engine
└── dependencies.py

frontend/src/
├── api/           # Axios client, types, endpoint functions
├── features/      # flow-editor, chat, settings, dashboard, auth
├── shared/        # shadcn/ui components, hooks, layouts, utils
└── styles/
```

## Pages

1. **Dashboard** (`/`) — stats cards, conversation chart
2. **Flow Editor** (`/flow/edit`) — React Flow canvas, script/step panels, test chat
3. **Chats** (`/chats`) — chat list, message history, operator takeover
4. **Settings** (`/settings`) — company info, AI config, rules/restrictions, RAG documents

## Code Standards

### Python (Backend)

STRICT TYPING. Equivalent to PHPStan level 10.

- ALL function parameters and return types MUST have type annotations
- Use `str`, `int`, `float`, `bool` — never `Any`
- Use `X | None` instead of `Optional[X]`
- Use `list[X]`, `dict[K, V]` — never bare `list`, `dict`
- Use Pydantic `BaseModel` for ALL data transfer — never raw dicts
- Use `Protocol` for abstract interfaces (not ABC)
- mypy strict mode must pass with zero errors
- Use `from __future__ import annotations` in every file
- `ruff` for linting and formatting, line length: 100

### TypeScript (Frontend)

STRICT TYPING. Zero tolerance for `any`.

- NEVER use `any` — use `unknown` + type guards if type is truly unknown
- NEVER use `as` type assertions unless absolutely unavoidable (and add a comment why)
- ALL function parameters and return types MUST be explicitly typed
- ALL component props MUST use typed interfaces
- ALL API responses MUST have corresponding TypeScript types
- Use `readonly` for immutable data
- `eslint` + `prettier` for formatting
- Naming: PascalCase for components/types, camelCase for functions/variables

### General Rules

- No dead code, no commented-out code
- No TODO comments without a linked issue
- No magic numbers — use named constants
- Error messages must be descriptive and actionable
- Every API endpoint must have Pydantic request/response schemas (backend) and TypeScript types (frontend)

## Commands

```bash
# Development (Docker)
docker compose up -d
docker compose exec backend python -m app.cli.install  # First-time setup

# Development (local)
cd backend && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev

# Celery worker
celery -A celery_app worker --loglevel=info

# Type checking
cd backend && mypy app --strict
cd frontend && npx tsc --noEmit

# Linting
cd backend && ruff check app && ruff format app
cd frontend && npx eslint src && npx prettier --check src

# Database migrations
cd backend && alembic upgrade head
cd backend && alembic revision --autogenerate -m "description"
```

## Docker: Dev vs Production

Dev mode uses `docker-compose.override.yml` (auto-loaded) which replaces nginx with Vite dev server + HMR. Source code changes apply instantly, no rebuild needed.

- **Dev (default):** `docker compose up -d` — Vite dev server on port 3023, HMR, volume-mounted sources
- **Production:** `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` — nginx + static build
- **After changing package.json:** `docker compose up -d --build frontend` (reinstall deps)

## API Endpoints

### Auth
- `POST /api/auth/login` — Login, returns token
- `POST /api/auth/install` — First-time user creation

### Flow
- `GET /api/flow` — Get flow with all scripts and steps
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
- `POST /api/chats/{id}/messages` — Operator sends message
- `PATCH /api/chats/{id}/bot-control` — Toggle bot on/off
- `WS /ws/chat/{id}` — WebSocket for real-time messages

### Chat (Public)
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
- `GET /api/analytics/summary` — Aggregate stats
- `GET /api/analytics/conversations` — Conversations over time

### Test Chat
- `POST /api/flow/test-chat` — Create test chat session
- `POST /api/flow/test-chat/{id}/message` — Send message in test chat
- `DELETE /api/flow/test-chat/{id}` — Delete test chat

### OpenAPI Docs
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Detailed Documentation Index

| Document | Contents |
|----------|----------|
| [docs/architecture.md](docs/architecture.md) | Full file trees for backend and frontend |
| [docs/data-models.md](docs/data-models.md) | All data models: Flow, Chat, Settings, RAG, Auth |
| [docs/api-spec.md](docs/api-spec.md) | Response format, pagination, error handling, examples |
| [docs/ai-integration.md](docs/ai-integration.md) | Provider/Embedder protocols, structured output, prompt assembly, channels |
| [docs/infrastructure.md](docs/infrastructure.md) | CORS, rate limiting, logging, health check, WebSocket, DB indexes, security, env vars, graceful shutdown |
| [docs/transactions.md](docs/transactions.md) | Transactional integrity, critical sections, isolation levels |
| [docs/testing-ci.md](docs/testing-ci.md) | Testing strategy, CI/CD pipeline, critical FSM test scenarios, error handling & retries |
| [docs/contributing.md](docs/contributing.md) | Setup guide, branch naming, PR process, adding providers/channels, Makefile, README structure |
