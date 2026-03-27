const WS_BASE_URL: string =
  import.meta.env.VITE_WS_URL ?? `ws://${window.location.host}/ws`;
const RECONNECT_DELAYS: readonly number[] = [1000, 2000, 4000, 8000, 15000];

export interface WSMessage {
  readonly event: string;
  readonly data: Record<string, unknown>;
}

type MessageHandler = (message: WSMessage) => void;

export class ChatWebSocket {
  private ws: WebSocket | null = null;
  private chatId: number;
  private handlers: MessageHandler[] = [];
  private attempt: number = 0;
  private closed: boolean = false;

  constructor(chatId: number) {
    this.chatId = chatId;
  }

  connect(): void {
    this.closed = false;
    this.ws = new WebSocket(`${WS_BASE_URL}/chat/${this.chatId}`);

    this.ws.onopen = (): void => {
      this.attempt = 0;
    };

    this.ws.onmessage = (event: MessageEvent<string>): void => {
      try {
        const message: WSMessage = JSON.parse(event.data) as WSMessage;
        for (const handler of this.handlers) {
          handler(message);
        }
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = (event: CloseEvent): void => {
      if (event.code !== 1000 && !this.closed) {
        const delay: number =
          RECONNECT_DELAYS[
            Math.min(this.attempt, RECONNECT_DELAYS.length - 1)
          ] ?? RECONNECT_DELAYS[0] ?? 1000;
        this.attempt++;
        setTimeout(() => this.connect(), delay);
      }
    };
  }

  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  disconnect(): void {
    this.closed = true;
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
    this.handlers = [];
  }
}
