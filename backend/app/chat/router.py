from __future__ import annotations

from fastapi import APIRouter, Depends, Request, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.chat import service as chat_service
from app.chat.schemas import (
    BotControlRequest,
    ChatListItem,
    ChatResponse,
    MessageResponse,
    OperatorMessageRequest,
    PublicChatInitRequest,
    PublicChatInitResponse,
    PublicMessageRequest,
)
from app.chat.tasks import process_ai_response
from app.chat.ws_manager import ws_manager
from app.common.pagination import PaginationParams, build_paginated_response, get_pagination
from app.common.schemas import ApiResponse, PaginatedResponse
from app.dependencies import get_current_user, get_db

router = APIRouter(tags=["chat"])

# ── Protected endpoints (require auth) ────────────────────────────


@router.get("/api/chats")
async def list_chats(
    pagination: PaginationParams = Depends(get_pagination),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PaginatedResponse[ChatListItem]:
    items, total = await chat_service.list_chats(db, pagination)
    return build_paginated_response(items, total, pagination)


@router.get("/api/chats/{chat_id}")
async def get_chat(
    chat_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[ChatResponse]:
    chat = await chat_service.get_chat_with_messages(db, chat_id)
    return ApiResponse.ok(data=ChatResponse.model_validate(chat))


@router.post("/api/chats/{chat_id}/messages")
async def send_operator_message(
    chat_id: int,
    payload: OperatorMessageRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[MessageResponse]:
    chat, message = await chat_service.send_operator_message(db, chat_id, payload.content)

    # Broadcast to WebSocket
    await ws_manager.broadcast(
        chat_id,
        "message.sent",
        {
            "id": message.id,
            "chat_id": chat_id,
            "sender_type": "user",
            "content": message.content,
            "message_type": "text",
            "created_at": message.created_at.isoformat(),
        },
    )
    await ws_manager.broadcast(
        chat_id,
        "chat.updated",
        {
            "id": chat.id,
            "is_controlled_by_bot": chat.is_controlled_by_bot,
            "termination_reason": chat.termination_reason,
        },
    )

    return ApiResponse.ok(
        data=MessageResponse.model_validate(message),
        message="Message sent",
    )


@router.patch("/api/chats/{chat_id}/bot-control")
async def toggle_bot_control(
    chat_id: int,
    payload: BotControlRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[ChatResponse]:
    chat = await chat_service.toggle_bot_control(db, chat_id, payload.is_controlled_by_bot)

    await ws_manager.broadcast(
        chat_id,
        "chat.updated",
        {
            "id": chat.id,
            "is_controlled_by_bot": chat.is_controlled_by_bot,
            "termination_reason": chat.termination_reason,
        },
    )

    return ApiResponse.ok(data=ChatResponse.model_validate(chat))


# ── WebSocket ─────────────────────────────────────────────────────


@router.websocket("/ws/chat/{chat_id}")
async def chat_websocket(websocket: WebSocket, chat_id: int) -> None:
    await ws_manager.connect(chat_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # Keep connection alive
    except WebSocketDisconnect:
        ws_manager.disconnect(chat_id, websocket)


# ── Public endpoints (no auth, rate-limited) ──────────────────────


@router.post("/api/public/chat/init")
async def public_init_chat(
    request: Request,
    payload: PublicChatInitRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[PublicChatInitResponse]:
    chat, visitor_id, is_new = await chat_service.init_public_chat(
        db, payload.visitor_id, payload.metadata
    )

    messages: list[MessageResponse] = [MessageResponse.model_validate(m) for m in chat.messages]

    return ApiResponse.ok(
        data=PublicChatInitResponse(
            chat_id=chat.id,
            visitor_id=visitor_id,
            is_new_chat=is_new,
            messages=messages,
        ),
    )


@router.post("/api/public/chat/{chat_id}/message")
async def public_send_message(
    request: Request,
    chat_id: int,
    payload: PublicMessageRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[MessageResponse]:
    # Save visitor message
    message = await chat_service.save_message(db, chat_id, payload.content, sender_type="visitor")
    await db.commit()
    await db.refresh(message)

    # Broadcast visitor message
    await ws_manager.broadcast(
        chat_id,
        "message.sent",
        {
            "id": message.id,
            "chat_id": chat_id,
            "sender_type": "visitor",
            "content": message.content,
            "message_type": "text",
            "created_at": message.created_at.isoformat(),
        },
    )

    # Dispatch AI processing via Celery
    process_ai_response.delay(chat_id, message.id)

    return ApiResponse.ok(
        data=MessageResponse.model_validate(message),
        message="Message received",
    )
