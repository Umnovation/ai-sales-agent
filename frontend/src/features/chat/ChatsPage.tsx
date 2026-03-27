import { useCallback, useEffect, useState } from "react";
import * as chatApi from "@/api/endpoints/chat";
import type { Chat, ChatListItem, Message } from "@/api/types/chat";
import { ChatList } from "./components/ChatList";
import { ChatMessages } from "./components/ChatMessages";
import { useChatWebSocket } from "./hooks/useChatWebSocket";

export function ChatsPage(): React.ReactElement {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // Load chat list
  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const response = await chatApi.fetchChats();
        setChats([...response.data]);
      } catch {
        // handled by interceptor
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  // Load selected chat with messages
  useEffect(() => {
    if (selectedChatId === null) {
      setSelectedChat(null);
      return;
    }

    async function loadChat(): Promise<void> {
      try {
        const response = await chatApi.fetchChat(selectedChatId!);
        if (response.data) {
          setSelectedChat(response.data);
        }
      } catch {
        // handled by interceptor
      }
    }
    void loadChat();
  }, [selectedChatId]);

  // WebSocket for real-time updates
  const handleNewMessage = useCallback(
    (message: Message): void => {
      if (selectedChat && message.chat_id === selectedChat.id) {
        setSelectedChat((prev) => {
          if (!prev) return prev;
          // Deduplicate
          if (prev.messages.some((m) => m.id === message.id)) return prev;
          return { ...prev, messages: [...prev.messages, message] };
        });
      }

      // Update chat list
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === message.chat_id
            ? {
                ...chat,
                last_message: message,
                updated_at: message.created_at,
              }
            : chat,
        ).sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        ),
      );
    },
    [selectedChat],
  );

  const handleChatUpdated = useCallback(
    (data: Record<string, unknown>): void => {
      const chatId = data["id"] as number | undefined;
      if (!chatId) return;

      if (selectedChat && selectedChat.id === chatId) {
        setSelectedChat((prev) =>
          prev
            ? {
                ...prev,
                is_controlled_by_bot: data["is_controlled_by_bot"] as boolean,
                termination_reason:
                  (data["termination_reason"] as string | null) ?? null,
              }
            : prev,
        );
      }
    },
    [selectedChat],
  );

  useChatWebSocket({
    chatId: selectedChatId,
    onNewMessage: handleNewMessage,
    onChatUpdated: handleChatUpdated,
  });

  async function handleBotToggle(
    chatId: number,
    isBot: boolean,
  ): Promise<void> {
    try {
      const response = await chatApi.toggleBotControl(chatId, isBot);
      if (response.data) {
        setSelectedChat(response.data);
      }
    } catch {
      // handled by interceptor
    }
  }

  function handleNewOperatorMessage(message: Message): void {
    handleNewMessage(message);
  }

  return (
    <div className="flex h-full">
      {/* Left panel — Chat list (280px) */}
      <div className="flex h-full w-[280px] flex-shrink-0 flex-col border-r border-[var(--app-border)] bg-white">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-[var(--app-font-muted)]">Loading...</p>
          </div>
        ) : (
          <ChatList
            chats={chats}
            selectedChatId={selectedChatId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectChat={setSelectedChatId}
          />
        )}
      </div>

      {/* Separator */}
      <div className="h-full w-px bg-[var(--app-border)]" />

      {/* Right area — Messages */}
      <div className="flex flex-1 flex-col">
        {selectedChat ? (
          <ChatMessages
            chat={selectedChat}
            onBotToggle={handleBotToggle}
            onNewMessage={handleNewOperatorMessage}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-[var(--app-font-muted)]">
              Select a chat to view messages
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
