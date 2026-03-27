import { apiClient } from "@/api/client";
import type { ApiResponse } from "@/api/types/common";
import type {
  AnalyticsSummary,
  CompanySettings,
  CompanySettingsUpdate,
  Context,
  ContextCreate,
  ContextUpdate,
  ConversationDataPoint,
  DocumentInfo,
} from "@/api/types/settings";

// Settings
export async function getSettings(): Promise<ApiResponse<CompanySettings>> {
  const { data } = await apiClient.get<ApiResponse<CompanySettings>>("/settings");
  return data;
}

export async function updateSettings(
  payload: CompanySettingsUpdate,
): Promise<ApiResponse<CompanySettings>> {
  const { data } = await apiClient.put<ApiResponse<CompanySettings>>(
    "/settings",
    payload,
  );
  return data;
}

// Contexts
export async function listContexts(): Promise<ApiResponse<Context[]>> {
  const { data } = await apiClient.get<ApiResponse<Context[]>>(
    "/settings/contexts",
  );
  return data;
}

export async function createContext(
  payload: ContextCreate,
): Promise<ApiResponse<Context>> {
  const { data } = await apiClient.post<ApiResponse<Context>>(
    "/settings/contexts",
    payload,
  );
  return data;
}

export async function updateContext(
  contextId: number,
  payload: ContextUpdate,
): Promise<ApiResponse<Context>> {
  const { data } = await apiClient.put<ApiResponse<Context>>(
    `/settings/contexts/${contextId}`,
    payload,
  );
  return data;
}

export async function deleteContext(
  contextId: number,
): Promise<ApiResponse<null>> {
  const { data } = await apiClient.delete<ApiResponse<null>>(
    `/settings/contexts/${contextId}`,
  );
  return data;
}

// Documents
export async function listDocuments(): Promise<ApiResponse<DocumentInfo[]>> {
  const { data } = await apiClient.get<ApiResponse<DocumentInfo[]>>(
    "/documents",
  );
  return data;
}

export async function uploadDocument(
  file: File,
): Promise<ApiResponse<DocumentInfo>> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<ApiResponse<DocumentInfo>>(
    "/documents/upload",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function deleteDocument(
  documentId: number,
): Promise<ApiResponse<null>> {
  const { data } = await apiClient.delete<ApiResponse<null>>(
    `/documents/${documentId}`,
  );
  return data;
}

// Analytics
export async function getAnalyticsSummary(): Promise<
  ApiResponse<AnalyticsSummary>
> {
  const { data } = await apiClient.get<ApiResponse<AnalyticsSummary>>(
    "/analytics/summary",
  );
  return data;
}

export async function getConversationsOverTime(
  days: number = 30,
): Promise<ApiResponse<ConversationDataPoint[]>> {
  const { data } = await apiClient.get<ApiResponse<ConversationDataPoint[]>>(
    "/analytics/conversations",
    { params: { days } },
  );
  return data;
}
