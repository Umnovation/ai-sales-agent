import { Search } from "lucide-react";
import type { ChatListItem } from "@/api/types/chat";

interface ChatListProps {
  readonly chats: readonly ChatListItem[];
  readonly selectedChatId: number | null;
  readonly searchQuery: string;
  readonly onSearchChange: (query: string) => void;
  readonly onSelectChat: (chatId: number) => void;
}

function formatRelativeTime(dateString: string): string {
  const now: number = Date.now();
  const then: number = new Date(dateString).getTime();
  const diffMs: number = now - then;
  const diffMin: number = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr: number = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay: number = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function ChatList({
  chats,
  selectedChatId,
  searchQuery,
  onSearchChange,
  onSelectChat,
}: ChatListProps): React.ReactElement {
  const filtered: readonly ChatListItem[] = searchQuery
    ? chats.filter(
        (chat) =>
          chat.last_message?.content
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ?? false,
      )
    : chats;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-[var(--app-border)] p-4">
        <h1 className="mb-3 text-lg font-semibold text-[var(--app-font-primary)]">
          Chats
        </h1>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-font-muted)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search chats..."
            className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-page)] pl-9 pr-3 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-[var(--app-font-muted)]">No chats yet</p>
          </div>
        ) : (
          filtered.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`flex w-full flex-col gap-1 border-b border-[var(--app-border-light)] px-4 py-3 text-left transition-colors ${
                selectedChatId === chat.id
                  ? "bg-[var(--app-hover-bg)]"
                  : "hover:bg-[var(--app-hover-bg)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      chat.is_controlled_by_bot
                        ? "bg-[var(--app-success)]"
                        : "bg-[var(--app-warning)]"
                    }`}
                  />
                  <span className="text-sm font-medium text-[var(--app-font-primary)]">
                    Visitor #{chat.id}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--app-font-muted)]">
                  {formatRelativeTime(chat.updated_at)}
                </span>
              </div>
              {chat.last_message && (
                <p className="truncate text-xs text-[var(--app-font-secondary)]">
                  {chat.last_message.content}
                </p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
