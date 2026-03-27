export interface Message {
  readonly id: number;
  readonly chat_id: number;
  readonly sender_type: "bot" | "visitor" | "user" | "system";
  readonly content: string;
  readonly message_type: "text" | "system_event";
  readonly created_at: string;
}

export interface Chat {
  readonly id: number;
  readonly source: string;
  readonly external_chat_id: string | null;
  readonly flow_script_id: number | null;
  readonly is_controlled_by_bot: boolean;
  readonly termination_reason: string | null;
  readonly is_test: boolean;
  readonly messages: readonly Message[];
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ChatListItem {
  readonly id: number;
  readonly source: string;
  readonly is_controlled_by_bot: boolean;
  readonly termination_reason: string | null;
  readonly is_test: boolean;
  readonly last_message: Message | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface TestChatResponse {
  readonly chat_id: number;
  readonly bot_response: string | null;
  readonly messages: readonly Message[];
}
