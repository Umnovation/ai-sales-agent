import { useCallback, useEffect, useRef } from "react";
import { ChatWebSocket, type WSMessage } from "@/shared/lib/websocket";
import type { Message } from "@/api/types/chat";

interface UseChatWebSocketOptions {
  readonly chatId: number | null;
  readonly onNewMessage: (message: Message) => void;
  readonly onChatUpdated: (data: Record<string, unknown>) => void;
}

export function useChatWebSocket({
  chatId,
  onNewMessage,
  onChatUpdated,
}: UseChatWebSocketOptions): void {
  const wsRef = useRef<ChatWebSocket | null>(null);

  const handleMessage = useCallback(
    (wsMessage: WSMessage): void => {
      if (wsMessage.event === "message.sent") {
        onNewMessage(wsMessage.data as unknown as Message);
      } else if (wsMessage.event === "chat.updated") {
        onChatUpdated(wsMessage.data);
      }
    },
    [onNewMessage, onChatUpdated],
  );

  useEffect(() => {
    if (chatId === null) return;

    const ws = new ChatWebSocket(chatId);
    ws.onMessage(handleMessage);
    ws.connect();
    wsRef.current = ws;

    return () => {
      ws.disconnect();
      wsRef.current = null;
    };
  }, [chatId, handleMessage]);
}
