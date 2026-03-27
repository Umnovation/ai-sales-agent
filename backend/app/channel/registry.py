"""Channel registry for looking up channel implementations by name."""
from __future__ import annotations

from app.channel.base import Channel
from app.channel.web_chat import WebChatChannel

_channels: dict[str, Channel] = {
    "web_chat": WebChatChannel(),
}


def get_channel(name: str) -> Channel:
    channel: Channel | None = _channels.get(name)
    if channel is None:
        available: str = ", ".join(_channels.keys())
        msg: str = f"Unknown channel '{name}'. Available: {available}"
        raise ValueError(msg)
    return channel


def register_channel(name: str, channel: Channel) -> None:
    """Register a new channel (for plugins/extensions)."""
    _channels[name] = channel
