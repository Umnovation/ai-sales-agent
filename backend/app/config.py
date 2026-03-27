from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_env: str = "development"
    app_debug: bool = True
    app_secret_key: str = "change-me-to-random-string"

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@db:5432/ai_sales_agent"
    database_echo: bool = False

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # AI Provider
    ai_provider: str = "openai"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    openai_embedding_model: str = "text-embedding-3-small"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # Auth
    jwt_expiration_days: int = 7

    # File Upload
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 10

    # Celery
    celery_broker_url: str = "redis://redis:6379/1"
    celery_result_backend: str = "redis://redis:6379/2"

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


settings = Settings()
