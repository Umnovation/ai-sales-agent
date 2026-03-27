from __future__ import annotations

import json

import structlog
from fastapi import WebSocket

logger: structlog.stdlib.BoundLogger = structlog.get_logger()


class ConnectionManager:
    """Manages WebSocket connections grouped by chat_id."""

    def __init__(self) -> None:
        self._connections: dict[int, list[WebSocket]] = {}

    async def connect(self, chat_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        if chat_id not in self._connections:
            self._connections[chat_id] = []
        self._connections[chat_id].append(websocket)
        logger.info("ws_connected", chat_id=chat_id)

    def disconnect(self, chat_id: int, websocket: WebSocket) -> None:
        if chat_id in self._connections:
            self._connections[chat_id] = [
                ws for ws in self._connections[chat_id] if ws != websocket
            ]
            if not self._connections[chat_id]:
                del self._connections[chat_id]
        logger.info("ws_disconnected", chat_id=chat_id)

    async def broadcast(self, chat_id: int, event: str, data: dict[str, object]) -> None:
        if chat_id not in self._connections:
            return

        message: str = json.dumps({"event": event, "data": data})
        dead_connections: list[WebSocket] = []

        for websocket in self._connections[chat_id]:
            try:
                await websocket.send_text(message)
            except Exception:
                dead_connections.append(websocket)

        for ws in dead_connections:
            self.disconnect(chat_id, ws)

    async def close_all(self, code: int = 1001, reason: str = "Server shutting down") -> None:
        for chat_id in list(self._connections.keys()):
            for ws in self._connections.get(chat_id, []):
                try:
                    await ws.close(code=code, reason=reason)
                except Exception:
                    pass
            self._connections.pop(chat_id, None)


ws_manager = ConnectionManager()
