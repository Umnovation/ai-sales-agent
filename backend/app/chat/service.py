from __future__ import annotations

import uuid

import structlog
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.chat.models import Chat, Message
from app.chat.schemas import ChatListItem, MessageResponse
from app.common.pagination import PaginationParams

logger: structlog.stdlib.BoundLogger = structlog.get_logger()


async def list_chats(
    db: AsyncSession,
    pagination: PaginationParams,
    include_test: bool = False,
) -> tuple[list[ChatListItem], int]:
    """List chats with last message, paginated."""
    query = select(Chat).options(selectinload(Chat.messages))

    if not include_test:
        query = query.where(Chat.is_test.is_(False))

    # Count total
    count_query = select(func.count(Chat.id))
    if not include_test:
        count_query = count_query.where(Chat.is_test.is_(False))
    total_result = await db.execute(count_query)
    total: int = total_result.scalar_one()

    # Fetch page
    query = (
        query.order_by(Chat.updated_at.desc()).offset(pagination.offset).limit(pagination.per_page)
    )
    result = await db.execute(query)
    chats: list[Chat] = list(result.scalars().all())

    items: list[ChatListItem] = []
    for chat in chats:
        last_msg: MessageResponse | None = None
        if chat.messages:
            last: Message = chat.messages[-1]
            last_msg = MessageResponse.model_validate(last)

        items.append(
            ChatListItem(
                id=chat.id,
                source=chat.source,
                is_controlled_by_bot=chat.is_controlled_by_bot,
                termination_reason=chat.termination_reason,
                is_test=chat.is_test,
                last_message=last_msg,
                created_at=chat.created_at,
                updated_at=chat.updated_at,
            )
        )

    return items, total


async def get_chat_with_messages(db: AsyncSession, chat_id: int) -> Chat:
    result = await db.execute(
        select(Chat).options(selectinload(Chat.messages)).where(Chat.id == chat_id)
    )
    chat: Chat | None = result.scalar_one_or_none()
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat


async def toggle_bot_control(db: AsyncSession, chat_id: int, is_bot: bool) -> Chat:
    result = await db.execute(select(Chat).where(Chat.id == chat_id).with_for_update())
    chat: Chat | None = result.scalar_one_or_none()
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")

    chat.is_controlled_by_bot = is_bot
    chat.termination_reason = None if is_bot else "operator_takeover"

    # Add system message
    event_text: str = "Bot control enabled" if is_bot else "Operator took control"
    system_msg = Message(
        chat_id=chat_id,
        sender_type="system",
        content=event_text,
        message_type="system_event",
    )
    db.add(system_msg)
    await db.commit()
    await db.refresh(chat, ["messages"])

    logger.info(
        "bot_resumed" if is_bot else "operator_takeover",
        chat_id=chat_id,
    )

    return chat


async def send_operator_message(
    db: AsyncSession, chat_id: int, content: str
) -> tuple[Chat, Message]:
    """Operator sends a message — automatically disables bot."""
    result = await db.execute(select(Chat).where(Chat.id == chat_id).with_for_update())
    chat: Chat | None = result.scalar_one_or_none()
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Disable bot
    chat.is_controlled_by_bot = False
    chat.termination_reason = "operator_message"

    # Save operator message
    message = Message(
        chat_id=chat_id,
        sender_type="user",
        content=content,
        message_type="text",
    )
    db.add(message)

    # Add system event
    system_msg = Message(
        chat_id=chat_id,
        sender_type="system",
        content="Bot disabled: operator sent a message",
        message_type="system_event",
    )
    db.add(system_msg)

    await db.commit()
    await db.refresh(chat, ["messages"])
    await db.refresh(message)

    logger.info("operator_message_sent", chat_id=chat_id)

    return chat, message


async def init_public_chat(
    db: AsyncSession,
    visitor_id: str | None,
    metadata: dict[str, object] | None,
) -> tuple[Chat, str, bool]:
    """Initialize a new public chat session."""
    resolved_visitor_id: str = visitor_id or str(uuid.uuid4())

    # Check if visitor already has a chat
    result = await db.execute(
        select(Chat)
        .options(selectinload(Chat.messages))
        .where(Chat.external_chat_id == resolved_visitor_id, Chat.is_test.is_(False))
        .limit(1)
    )
    existing_chat: Chat | None = result.scalar_one_or_none()

    if existing_chat is not None:
        return existing_chat, resolved_visitor_id, False

    # Create new chat
    chat = Chat(
        source="web_chat",
        external_chat_id=resolved_visitor_id,
        metadata_=metadata,
    )
    db.add(chat)
    await db.commit()
    await db.refresh(chat, ["messages"])

    logger.info("public_chat_initialized", chat_id=chat.id, visitor_id=resolved_visitor_id)

    return chat, resolved_visitor_id, True


async def save_message(db: AsyncSession, chat_id: int, content: str, sender_type: str) -> Message:
    message = Message(
        chat_id=chat_id,
        sender_type=sender_type,
        content=content,
        message_type="text",
    )
    db.add(message)
    await db.flush()
    await db.refresh(message)
    return message
