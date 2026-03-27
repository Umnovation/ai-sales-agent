import { type FormEvent, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { Chat, Message } from "@/api/types/chat";
import { MessageBubble } from "./MessageBubble";
import * as chatApi from "@/api/endpoints/chat";

interface ChatMessagesProps {
  readonly chat: Chat;
  readonly onBotToggle: (chatId: number, isBot: boolean) => Promise<void>;
  readonly onNewMessage: (message: Message) => void;
}

export function ChatMessages({
  chat,
  onBotToggle,
  onNewMessage,
}: ChatMessagesProps): React.ReactElement {
  const [input, setInput] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages]);

  async function handleSend(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const content: string = input.trim();
    setInput("");
    setSending(true);

    try {
      const response = await chatApi.sendOperatorMessage(chat.id, content);
      if (response.data) {
        onNewMessage(response.data);
      }
    } catch {
      // handled by interceptor
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--app-border)] bg-white px-5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[var(--app-font-primary)]">
            Visitor #{chat.id}
          </span>
          <span className="text-xs text-[var(--app-font-muted)]">
            {chat.source}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div
              className={`h-2 w-2 rounded-full ${
                chat.is_controlled_by_bot
                  ? "bg-[var(--app-success)]"
                  : "bg-[var(--app-warning)]"
              }`}
            />
            <span className="text-xs text-[var(--app-font-secondary)]">
              {chat.is_controlled_by_bot ? "Active" : "Paused"}
            </span>
          </div>
          <button
            onClick={() => void onBotToggle(chat.id, !chat.is_controlled_by_bot)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              chat.is_controlled_by_bot
                ? "border border-[var(--app-warning)] text-[var(--app-warning)] hover:bg-amber-50"
                : "bg-[var(--app-primary)] text-white hover:bg-[var(--app-primary-dark)]"
            }`}
          >
            {chat.is_controlled_by_bot ? "Override Bot" : "Enable Bot"}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col gap-3">
          {chat.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-[var(--app-border)] bg-white p-4">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="h-10 flex-1 rounded-lg border border-[var(--app-border)] bg-white px-3 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--app-primary)] text-white transition-colors hover:bg-[var(--app-primary-dark)] disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
