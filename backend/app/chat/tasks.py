"""Celery tasks for async message processing."""

from __future__ import annotations

import asyncio

import structlog

from app.celery_app import celery_app

logger: structlog.stdlib.BoundLogger = structlog.get_logger()


class AIProviderError(Exception):
    """Raised when AI provider call fails."""


@celery_app.task(
    bind=True,
    max_retries=3,
    autoretry_for=(AIProviderError, ConnectionError),
    retry_backoff=True,
    retry_backoff_max=30,
    retry_jitter=True,
)
def process_ai_response(self: object, chat_id: int, message_id: int) -> None:  # type: ignore[override]
    """Process incoming message and generate AI response.

    Runs the full FSM engine cycle within a transaction.
    """
    asyncio.run(_process_ai_response_async(chat_id, message_id))


async def _process_ai_response_async(chat_id: int, message_id: int) -> None:
    from app.ai.providers.openai_provider import OpenAIProvider
    from app.chat.models import Message
    from app.chat.service import save_message
    from app.chat.ws_manager import ws_manager
    from app.database import async_session_factory
    from app.flow.engine import process_message

    log = logger.bind(chat_id=chat_id, message_id=message_id)
    log.info("processing_ai_response")

    ai_provider = OpenAIProvider()

    async with async_session_factory() as db:
        async with db.begin():
            # Get the user message content
            from sqlalchemy import select

            msg_result = await db.execute(select(Message).where(Message.id == message_id))
            user_message: Message | None = msg_result.scalar_one_or_none()

            if user_message is None:
                log.error("message_not_found")
                return

            # Optionally retrieve RAG context
            rag_context: str = ""
            try:
                from app.rag.service import retrieve_relevant_chunks

                chunks: list[str] = await retrieve_relevant_chunks(
                    db, ai_provider, user_message.content, limit=3
                )
                if chunks:
                    rag_context = "\n\n".join(chunks)
            except Exception:
                log.warning("rag_retrieval_failed", exc_info=True)

            # Run FSM engine
            try:
                response: str | None = await process_message(
                    db, ai_provider, chat_id, user_message.content, rag_context
                )
            except Exception as exc:
                log.error("engine_processing_failed", error=str(exc), exc_info=True)
                raise AIProviderError(str(exc)) from exc

            if response is None:
                log.info("no_response_generated")
                return

            # Save bot response
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


@celery_app.task
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
