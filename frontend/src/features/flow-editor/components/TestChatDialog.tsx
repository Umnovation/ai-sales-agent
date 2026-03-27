import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { X, RotateCcw, Send, Loader2 } from "lucide-react";
import * as chatApi from "@/api/endpoints/chat";
import type { Message } from "@/api/types/chat";

interface TestChatDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function TestChatDialog({
  isOpen,
  onClose,
}: TestChatDialogProps): React.ReactElement | null {
  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initChat = useCallback(async (): Promise<void> => {
    try {
      const response = await chatApi.createTestChat();
      if (response.data) {
        setChatId(response.data.id);
        setMessages([]);
      }
    } catch {
      // handled by interceptor
    }
  }, []);

  useEffect(() => {
    if (isOpen && chatId === null) {
      void initChat();
    }
  }, [isOpen, chatId, initChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!input.trim() || !chatId || sending) return;

    const content: string = input.trim();
    setInput("");
    setSending(true);

    // Optimistic add user message
    const tempUserMsg: Message = {
      id: Date.now(),
      chat_id: chatId,
      sender_type: "visitor",
      content,
      message_type: "text",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await chatApi.sendTestMessage(chatId, content);
      if (response.data) {
        setMessages([...response.data.messages]);
      }
    } catch {
      // handled by interceptor
    } finally {
      setSending(false);
    }
  }

  async function handleReset(): Promise<void> {
    if (chatId) {
      try {
        await chatApi.deleteTestChat(chatId);
      } catch {
        // ignore
      }
    }
    setChatId(null);
    setMessages([]);
    void initChat();
  }

  function handleClose(): void {
    if (chatId) {
      void chatApi.deleteTestChat(chatId);
    }
    setChatId(null);
    setMessages([]);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="flex h-[600px] w-[500px] flex-col rounded-xl border border-[var(--app-border)] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-[var(--app-border)] px-5">
          <h2 className="text-sm font-semibold text-[var(--app-font-primary)]">
            Test Chat
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => void handleReset()}
              className="rounded p-1.5 text-[var(--app-font-muted)] transition-colors hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-font-primary)]"
              title="Reset chat"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={handleClose}
              className="rounded p-1.5 text-[var(--app-font-muted)] transition-colors hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-font-primary)]"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-[var(--app-font-muted)]">
                Send a message to test your flow
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages
                .filter((m) => m.message_type === "text" || m.message_type === "debug")
                .map((msg) =>
                  msg.message_type === "debug" ? (
                    <div key={msg.id} className="flex justify-center">
                      <span className="max-w-[90%] text-center text-[11px] leading-tight text-[var(--app-font-muted)]">
                        {msg.content}
                      </span>
                    </div>
                  ) : (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_type === "visitor" ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-xl px-3.5 py-2.5 text-sm ${
                          msg.sender_type === "visitor"
                            ? "bg-[var(--app-chat-visitor-bg)] text-[var(--app-font-primary)]"
                            : "bg-[var(--app-chat-bot-bg)] text-white"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ),
                )}
              {sending && (
                <div className="flex justify-end">
                  <div className="flex items-center gap-2 rounded-xl bg-[var(--app-chat-bot-bg)] px-3.5 py-2.5 text-sm text-white">
                    <Loader2 size={14} className="animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-[var(--app-border)] p-4">
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
    </div>
  );
}
