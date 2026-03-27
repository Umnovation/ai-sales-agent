# Contributing

## Prerequisites

- Python 3.12+
- Node 20+
- Docker
- PostgreSQL 16

## Development Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in values
3. Start services: `docker compose up -d`
4. Run install: `make install`

## Branch Naming

- `feature/short-description`
- `fix/short-description`

## Commit Messages

Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`

## PR Process

1. Create branch
2. Make changes
3. Run `make lint`
4. Run `make test`
5. Open PR

## Adding a New AI Provider

Implement the `AIProvider` Protocol from `app/ai/provider.py`:

```python
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

## Adding a New Channel

Implement the `Channel` Protocol from `app/channel/base.py`:

```python
class Channel(Protocol):
    async def send_message(self, chat_id: str, content: str) -> None: ...
    async def receive_message(self) -> IncomingMessage: ...
```

## Makefile

```makefile
.PHONY: dev test lint migrate install clean

dev:                           ## Start all services
	docker compose up -d
	docker compose logs -f backend worker

test:                          ## Run all tests
	cd backend && pytest -v
	cd frontend && npx vitest run

test-backend:                  ## Run backend tests only
	cd backend && pytest -v

test-frontend:                 ## Run frontend tests only
	cd frontend && npx vitest run

lint:                          ## Run all linters
	cd backend && ruff check app && ruff format --check app && mypy app --strict
	cd frontend && npx tsc --noEmit && npx eslint src && npx prettier --check src

lint-fix:                      ## Auto-fix linting issues
	cd backend && ruff check app --fix && ruff format app
	cd frontend && npx eslint src --fix && npx prettier --write src

migrate:                       ## Run database migrations
	cd backend && alembic upgrade head

migrate-new:                   ## Create new migration
	@read -p "Migration name: " name; \
	cd backend && alembic revision --autogenerate -m "$$name"

install:                       ## First-time setup
	docker compose exec backend python -m app.cli.install

clean:                         ## Stop and remove all containers + volumes
	docker compose down -v

help:                          ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' Makefile | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
```

## README Structure

The README.md must include these sections in order:

1. **Title + badges** — CI status, license, Python/Node versions
2. **One-line description** — "AI-powered sales agent with a visual flow editor"
3. **Screenshot/GIF** — working flow editor + chat
4. **Features** — bullet list of key capabilities
5. **Quick Start** — `git clone` → `cp .env.example .env` → `docker compose up` → `make install` → open browser
6. **Architecture** — mermaid diagram showing services
7. **Tech Stack** — table with versions
8. **Project Structure** — abbreviated tree
9. **Development** — how to run locally without Docker
10. **Contributing** — link to CONTRIBUTING.md
11. **License** — MIT
12. **Acknowledgments** — "Inspired by [Dialogex](https://dialogex.io)"

## License

MIT License. Full text in `LICENSE` file.
