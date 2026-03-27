"""Test chat endpoints for flow editor.

Test chats run synchronously (no Celery) and are marked with is_test=True.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.provider import AIProvider
from app.auth.models import User
from app.chat.models import Chat, Message
from app.chat.schemas import ChatResponse, MessageResponse
from app.common.schemas import ApiResponse
from app.dependencies import get_ai_provider, get_current_user, get_db
from app.flow.engine import ProcessResult, process_message

router = APIRouter(prefix="/api/flow/test-chat", tags=["test-chat"])


class TestMessageRequest(BaseModel):
    content: str


class TestChatResponse(BaseModel):
    chat_id: int
    bot_response: str | None
    messages: list[MessageResponse]


@router.post("", status_code=201)
async def create_test_chat(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[ChatResponse]:
    chat = Chat(source="test", is_test=True)
    db.add(chat)
    await db.commit()
    await db.refresh(chat, ["messages"])

    return ApiResponse.ok(
        data=ChatResponse.model_validate(chat),
        message="Test chat created",
    )


@router.post("/{chat_id}/message")
async def send_test_message(
    chat_id: int,
    payload: TestMessageRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    ai_provider: AIProvider = Depends(get_ai_provider),
) -> ApiResponse[TestChatResponse]:
    # Verify it's a test chat
    result = await db.execute(select(Chat).where(Chat.id == chat_id, Chat.is_test.is_(True)))
    chat: Chat | None = result.scalar_one_or_none()
    if chat is None:
        raise HTTPException(status_code=404, detail="Test chat not found")

    # Save user message
    user_message = Message(
        chat_id=chat_id,
        sender_type="visitor",
        content=payload.content,
        message_type="text",
    )
    db.add(user_message)
    await db.flush()

    # Process synchronously (no Celery)
    proc_result: ProcessResult = await process_message(db, ai_provider, chat_id, payload.content)

    # Save debug events as system messages (only in test chat)
    for event in proc_result.debug_events:
        db.add(Message(
            chat_id=chat_id,
            sender_type="system",
            content=event,
            message_type="debug",
        ))

    # Save bot response
    if proc_result.response is not None:
        bot_message = Message(
            chat_id=chat_id,
            sender_type="bot",
            content=proc_result.response,
            message_type="text",
        )
        db.add(bot_message)

    await db.commit()

    # Reload messages
    msg_result = await db.execute(
        select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at)
    )
    messages: list[Message] = list(msg_result.scalars().all())

    return ApiResponse.ok(
        data=TestChatResponse(
            chat_id=chat_id,
            bot_response=proc_result.response,
            messages=[MessageResponse.model_validate(m) for m in messages],
        ),
    )


@router.delete("/{chat_id}")
async def delete_test_chat(
    chat_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[None]:
    result = await db.execute(select(Chat).where(Chat.id == chat_id, Chat.is_test.is_(True)))
    chat: Chat | None = result.scalar_one_or_none()
    if chat is None:
        raise HTTPException(status_code=404, detail="Test chat not found")

    await db.delete(chat)
    await db.commit()

    return ApiResponse.ok(data=None, message="Test chat deleted")
