# Architecture

## Backend (FastAPI, domain-driven)

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

## Frontend (React, feature-based)

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

## Docker Compose

```
docker-compose.yml
├── db         PostgreSQL 16 + pgvector extension
├── redis      Redis 7 (Celery broker + result backend)
├── backend    FastAPI (uvicorn, port 8000)
├── worker     Celery worker (same image as backend, different entrypoint)
├── frontend   React (nginx, port 3000)
```
