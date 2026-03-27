# Project Memory

> Автоматически обновляется Claude Code

## Обзор проекта
Open-source AI sales agent с визуальным редактором диалоговых сценариев. Lite-версия [Dialogex](https://dialogex.io) на Python/React стеке. Один Flow на инстанс, без multi-tenancy.

## Архитектура

### Backend (FastAPI, domain-driven)
- **auth** — User, JWT, login/install, CLI install script
- **flow** — Flow/FlowScript/FlowScriptStep models, CRUD, FSM engine, test chat
- **chat** — Chat/Message/StepAttempt, WebSocket manager, Celery tasks, operator takeover
- **ai** — AIProvider Protocol, OpenAI implementation, XML промпты, structured output
- **rag** — Document upload, chunking, OpenAI embeddings, pgvector retrieval
- **settings** — CompanySettings, Context (rules/restrictions)
- **analytics** — Summary stats, conversations over time
- **common** — ApiResponse[T], PaginatedResponse[T], exception handlers, pagination
- **health** — Full health check (db + redis + ai_provider)
- **channel** — Channel Protocol, WebChatChannel, registry

### Frontend (React, feature-based)
- Vite + React 18 + TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui
- React Flow для редактора сценариев
- Zustand / React Query для state management

### Инфраструктура
- Docker Compose: PostgreSQL (pgvector), Redis, backend (uvicorn), worker (Celery), frontend (nginx)
- Alembic для миграций
- Celery + Redis для async message processing

## Зависимости
- **Backend**: FastAPI, SQLAlchemy async, Pydantic v2, Celery, OpenAI SDK, pgvector, structlog, slowapi, passlib+jose
- **Frontend**: React, TypeScript, Tailwind, shadcn/ui, React Flow, Axios, React Router, Recharts

## Важные файлы
- `CLAUDE.md` — полная спецификация проекта (~1600 строк)
- `backend/app/flow/engine.py` — FSM движок (ядро системы)
- `backend/app/chat/tasks.py` — Celery task для обработки сообщений
- `backend/app/ai/prompts/*.xml` — XML шаблоны промптов
- `backend/app/ai/provider.py` — AIProvider Protocol
- `backend/app/common/schemas.py` — ApiResponse[T] generic
- `docker-compose.yml` — все 5 сервисов

## Известные особенности
- Python 3.12+ required (generics syntax `list[X]`, `type[T]`)
- Промпты хранятся в XML файлах, не в Python коде
- Один Flow на инстанс — все sources → один flow
- Дизайн фронтенда через workflow: ТЗ → Pencil mockup → React implementation
- Строгая типизация: mypy --strict (Python), strict tsconfig (TypeScript)

## Последние изменения
- [2026-03-27] Phases 1-11 бэкенда завершены — полная серверная часть написана
- [2026-03-27] CLAUDE.md создан с полной спецификацией (~1600 строк)
- [2026-03-27] Проект инициализирован, архитектура обсуждена и зафиксирована
