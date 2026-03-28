"""Celery tasks for async message processing."""

from __future__ import annotations

import asyncio

import structlog

from app.celery_app import celery_app

logger: structlog.stdlib.BoundLogger = structlog.get_logger()


class AIProviderError(Exception):
    """Raised when AI provider call fails."""


@celery_app.task(  # type: ignore[untyped-decorator]
    bind=True,
    max_retries=3,
    autoretry_for=(AIProviderError, ConnectionError),
    retry_backoff=True,
    retry_backoff_max=30,
    retry_jitter=True,
)
def process_ai_response(self: object, chat_id: int, message_id: int) -> None:
    """Process incoming message and generate AI response.

    Runs the full FSM engine cycle within a transaction.
    """
    asyncio.run(_process_ai_response_async(chat_id, message_id))


async def _process_ai_response_async(chat_id: int, message_id: int) -> None:
    from sqlalchemy import select

    from app.ai.providers.openai_provider import OpenAIProvider
    from app.chat.models import Message
    from app.chat.service import save_message
    from app.chat.ws_manager import ws_manager
    from app.database import async_session_factory
    from app.flow.engine import ProcessResult, process_message
    from app.settings.models import CompanySettings

    log = logger.bind(chat_id=chat_id, message_id=message_id)
    log.info("processing_ai_response")

    async with async_session_factory() as db:
        async with db.begin():
            # Load AI configuration from settings
            settings_result = await db.execute(select(CompanySettings).limit(1))
            cs: CompanySettings | None = settings_result.scalar_one_or_none()
            if cs is None or not cs.ai_api_key:
                log.error("ai_not_configured")
                return

            ai_provider = OpenAIProvider(
                api_key=cs.ai_api_key,
                model=cs.ai_model,
                embedding_model=cs.ai_embedding_model,
            )

            # Get the user message content
            msg_result = await db.execute(select(Message).where(Message.id == message_id))
            user_message: Message | None = msg_result.scalar_one_or_none()

            if user_message is None:
                log.error("message_not_found")
                return

            # Run FSM engine (RAG retrieval happens inside process_message)
            try:
                proc_result: ProcessResult = await process_message(
                    db, ai_provider, chat_id, user_message.content
                )
            except Exception as exc:
                log.error("engine_processing_failed", error=str(exc), exc_info=True)
                raise AIProviderError(str(exc)) from exc

            if proc_result.response is None:
                log.info("no_response_generated")
                return

            # Save bot response
            response: str = proc_result.response
            bot_message: Message = await save_message(db, chat_id, response, sender_type="bot")

            log.info("bot_response_saved", bot_message_id=bot_message.id)

        # Broadcast via WebSocket (outside transaction)
        await ws_manager.broadcast(
            chat_id,
            "message.sent",
            {
                "id": bot_message.id,
                "chat_id": chat_id,
                "sender_type": "bot",
                "content": response,
                "message_type": "text",
                "created_at": bot_message.created_at.isoformat(),
            },
        )


@celery_app.task  # type: ignore[untyped-decorator]
def on_ai_response_failure(
    request: object,
    exc: Exception,
    traceback: object,
    chat_id: int,
    message_id: int,
) -> None:
    """Fallback: send error message when all retries exhausted."""
    asyncio.run(_send_fallback_message(chat_id))


async def _send_fallback_message(chat_id: int) -> None:
    from app.chat.service import save_message
    from app.chat.ws_manager import ws_manager
    from app.database import async_session_factory

    fallback: str = (
        "Sorry, I'm experiencing technical difficulties. A team member will follow up shortly."
    )

    async with async_session_factory() as db:
        msg = await save_message(db, chat_id, fallback, sender_type="bot")
        await db.commit()

    await ws_manager.broadcast(
        chat_id,
        "message.sent",
        {
            "id": msg.id,
            "chat_id": chat_id,
            "sender_type": "bot",
            "content": fallback,
            "message_type": "text",
            "created_at": msg.created_at.isoformat(),
        },
    )
    logger.error("ai_response_failed_fallback_sent", chat_id=chat_id)
