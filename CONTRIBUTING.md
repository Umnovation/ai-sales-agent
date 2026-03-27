# Contributing

Thanks for your interest in contributing to AI Sales Agent!

## Prerequisites

- Python 3.12+
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (via Docker)

## Development Setup

```bash
# Clone the repository
git clone https://github.com/your-username/ai-sales-agent.git
cd ai-sales-agent

# Start services
cp backend/.env.example backend/.env
# Edit backend/.env — set your OPENAI_API_KEY
make dev

# Create initial user
make install

# Open http://localhost:3000
```

### Without Docker

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Celery worker (separate terminal)
celery -A app.celery_app worker --loglevel=info

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Code Standards

See [CLAUDE.md](CLAUDE.md) for full details.

### Python
- `mypy --strict` must pass with zero errors
- `ruff check` and `ruff format` must pass
- All functions typed — no `Any`, no bare `list`/`dict`
- Use `Protocol` for interfaces, not ABC
- Pydantic `BaseModel` for all DTOs

### TypeScript
- `tsc --noEmit` must pass with zero errors
- Never use `any` — use `unknown` + type guards
- All component props must be typed interfaces
- All API responses must have corresponding types

## Branch Naming

```
feature/short-description
fix/short-description
docs/short-description
refactor/short-description
```

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add telegram channel integration
fix: prevent race condition in operator takeover
docs: update API endpoint documentation
refactor: extract prompt builder into separate module
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run `make lint` — fix any issues
4. Run `make test` — ensure all pass
5. Open a PR with a clear description

## Adding a New AI Provider

1. Create `backend/app/ai/providers/your_provider.py`
2. Implement the `AIProvider` Protocol (see `app/ai/provider.py`)
3. Register in `app/dependencies.py`
4. Add configuration to `app/config.py`

## Adding a New Channel

1. Create `backend/app/channel/your_channel.py`
2. Implement the `Channel` Protocol (see `app/channel/base.py`)
3. Register in `app/channel/registry.py`

## Questions?

Open an issue on GitHub.
