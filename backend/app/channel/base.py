from __future__ import annotations

from typing import Protocol, runtime_checkable

from pydantic import BaseModel


class IncomingMessage(BaseModel):
    """Standardized incoming message from any channel."""

    chat_id: str
    content: str
    sender_id: str
    metadata: dict[str, object] | None = None


@runtime_checkable
class Channel(Protocol):
    """Abstract interface for message channels.

    Contributors can implement this protocol to add new channels
    (e.g., TelegramChannel, WhatsAppChannel).
    """

    async def send_message(self, chat_id: str, content: str) -> None:
        """Send a message to the external channel."""
        ...

    async def receive_message(self) -> IncomingMessage:
        """Receive a message from the external channel."""
        ...
