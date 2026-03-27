"""Built-in web chat channel using WebSocket.

This is the default channel. Messages are sent/received via the
WebSocket connection managed by ws_manager.
"""
from __future__ import annotations

from app.channel.base import IncomingMessage
from app.chat.ws_manager import ws_manager


class WebChatChannel:
    """WebSocket-based channel for the built-in web chat."""

    async def send_message(self, chat_id: str, content: str) -> None:
        await ws_manager.broadcast(
            int(chat_id),
            "message.sent",
            {
                "chat_id": int(chat_id),
                "sender_type": "bot",
                "content": content,
                "message_type": "text",
            },
        )

    async def receive_message(self) -> IncomingMessage:
        raise NotImplementedError(
            "WebChatChannel receives messages via REST API, not polling."
        )
