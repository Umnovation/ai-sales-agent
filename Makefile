.PHONY: dev test lint migrate install clean help

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
	docker compose exec backend alembic upgrade head

migrate-new:                   ## Create new migration
	@read -p "Migration name: " name; \
	docker compose exec backend alembic revision --autogenerate -m "$$name"

# Setup
install:                       ## First-time setup (creates user, runs migrations)
	docker compose exec backend alembic upgrade head
	docker compose exec backend python -m app.cli.install

# Cleanup
clean:                         ## Stop and remove all containers + volumes
	docker compose down -v

help:                          ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' Makefile | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
