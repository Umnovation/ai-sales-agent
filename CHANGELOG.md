# CHANGELOG

## [2026-03-27 16:30]

### Что сделано
- Завершены все бэкенд-фазы (1-11): scaffolding, database, auth, settings, flow CRUD, AI provider, chat + FSM engine, RAG, analytics, test chat, health check
- Создан полный бэкенд с 7 доменами и 68 файлами

### Затронутые файлы
- `backend/app/main.py` — FastAPI app с CORS, lifespan, exception handlers, все роутеры
- `backend/app/flow/engine.py` — FSM движок: acceptance criteria → resolve step → execute → evaluate → route
- `backend/app/chat/tasks.py` — Celery tasks с retry policy и fallback message
- `backend/app/chat/ws_manager.py` — WebSocket connection manager
- `backend/app/ai/provider.py` — AIProvider Protocol
- `backend/app/ai/providers/openai_provider.py` — OpenAI implementation
- `backend/app/ai/prompts/*.xml` — 3 XML промпта (generate_response, check_completion, check_transition)
- `backend/app/ai/prompts/loader.py` — XML prompt loader
- `backend/app/rag/` — Document upload, chunking, OpenAI embeddings, pgvector retrieval
- `backend/app/common/schemas.py` — ApiResponse[T], PaginatedResponse[T]
- `backend/app/common/exceptions.py` — Centralized exception handlers
- `backend/app/analytics/` — Summary stats, conversations over time
- `backend/app/health/router.py` — Full health check (db + redis + ai)
- `docker-compose.yml` — 5 сервисов
- `Makefile` — dev, test, lint, migrate, install, clean

### Детали
Архитектура domain-driven. Все абстракции через Protocol (AIProvider, Channel, Embedder). Транзакционная целостность через FOR UPDATE на Chat. Celery retry с exponential backoff. Graceful shutdown в lifespan.

---

## [2026-03-27 12:00]

### Что сделано
- Создан CLAUDE.md — полная спецификация проекта
- Обсуждена и зафиксирована архитектура: FastAPI + React + PostgreSQL + Celery + Redis
- Определены страницы: Dashboard, Flow Editor, Chats, Settings
- Определены правила кода: strict typing, no any, Protocol for interfaces

### Затронутые файлы
- `CLAUDE.md` — ~1600 строк спецификации

### Детали
Проект вдохновлён Dialogex (dialogex.io). Исследован бэкенд (Laravel) и фронтенд (Vue) оригинального продукта для переноса логики.

---
