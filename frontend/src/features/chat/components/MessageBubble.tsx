import type { Message } from "@/api/types/chat";

interface MessageBubbleProps {
  readonly message: Message;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({
  message,
}: MessageBubbleProps): React.ReactElement {
  // System messages
  if (message.sender_type === "system" || message.message_type === "system_event") {
    return (
      <div className="flex justify-center py-1">
        <span className="text-xs italic text-[var(--app-font-muted)]">
          {message.content}
        </span>
      </div>
    );
  }

  const isVisitor: boolean = message.sender_type === "visitor";
  const isBot: boolean = message.sender_type === "bot";
  const isOperator: boolean = message.sender_type === "user";

  let bgColor: string;
  let textColor: string;

  if (isVisitor) {
    bgColor = "bg-[var(--app-chat-visitor-bg)]";
    textColor = "text-[var(--app-font-primary)]";
  } else if (isBot) {
    bgColor = "bg-[var(--app-chat-bot-bg)]";
    textColor = "text-white";
  } else if (isOperator) {
    bgColor = "bg-[var(--app-chat-operator-bg)]";
    textColor = "text-white";
  } else {
    bgColor = "bg-[var(--app-chat-visitor-bg)]";
    textColor = "text-[var(--app-font-primary)]";
  }

  return (
    <div className={`flex ${isVisitor ? "justify-start" : "justify-end"}`}>
      <div className="flex max-w-[65%] flex-col gap-1">
        <div className={`rounded-xl px-3.5 py-2.5 text-sm ${bgColor} ${textColor}`}>
          {message.content}
        </div>
        <span
          className={`text-[10px] text-[var(--app-font-muted)] ${
            isVisitor ? "text-left" : "text-right"
          }`}
        >
          {isOperator ? "Operator" : isBot ? "Bot" : ""}{" "}
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}
