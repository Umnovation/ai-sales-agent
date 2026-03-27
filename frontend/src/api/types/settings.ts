export interface CompanySettings {
  readonly id: number;
  readonly company_name: string;
  readonly company_description: string | null;
  readonly ai_provider: string;
  readonly ai_model: string;
  readonly ai_api_key_set: boolean;
  readonly ai_embedding_model: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CompanySettingsUpdate {
  readonly company_name?: string;
  readonly company_description?: string | null;
  readonly ai_provider?: string;
  readonly ai_model?: string;
  readonly ai_api_key?: string;
  readonly ai_embedding_model?: string;
}

export interface Context {
  readonly id: number;
  readonly type: "rule" | "restriction";
  readonly text: string;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ContextCreate {
  readonly type: "rule" | "restriction";
  readonly text: string;
  readonly is_active?: boolean;
}

export interface ContextUpdate {
  readonly type?: "rule" | "restriction";
  readonly text?: string;
  readonly is_active?: boolean;
}

export interface ModelInfo {
  readonly id: string;
  readonly name: string;
}

export interface AvailableModelsResponse {
  readonly chat_models: readonly ModelInfo[];
  readonly embedding_models: readonly ModelInfo[];
}

export interface DocumentInfo {
  readonly id: number;
  readonly filename: string;
  readonly file_type: string;
  readonly file_size: number;
  readonly chunk_count: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface AnalyticsSummary {
  readonly total_chats: number;
  readonly active_chats: number;
  readonly completed_chats: number;
  readonly completion_rate: number;
}

export interface ConversationDataPoint {
  readonly date: string;
  readonly count: number;
}
