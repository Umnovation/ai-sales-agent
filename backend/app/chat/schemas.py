from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class MessageResponse(BaseModel):
    id: int
    chat_id: int
    sender_type: str
    content: str
    message_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatResponse(BaseModel):
    id: int
    source: str
    external_chat_id: str | None
    flow_script_id: int | None
    is_controlled_by_bot: bool
    termination_reason: str | None
    is_test: bool
    messages: list[MessageResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChatListItem(BaseModel):
    id: int
    source: str
    is_controlled_by_bot: bool
    termination_reason: str | None
    is_test: bool
    last_message: MessageResponse | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OperatorMessageRequest(BaseModel):
    content: str


class BotControlRequest(BaseModel):
    is_controlled_by_bot: bool


class PublicChatInitRequest(BaseModel):
    visitor_id: str | None = None
    metadata: dict[str, object] | None = None


class PublicChatInitResponse(BaseModel):
    chat_id: int
    visitor_id: str
    is_new_chat: bool
    messages: list[MessageResponse]


class PublicMessageRequest(BaseModel):
    content: str
    visitor_id: str


# WebSocket event schemas


class WSEvent(BaseModel):
    event: str
    data: dict[str, object]
