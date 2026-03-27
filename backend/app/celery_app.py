from __future__ import annotations

from celery import Celery

from app.config import settings

celery_app = Celery(
    "ai_sales_agent",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_shutdown_timeout=30,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_cancel_long_running_tasks_on_connection_loss=False,
    task_track_started=True,
)

celery_app.autodiscover_tasks(["app.chat"])
