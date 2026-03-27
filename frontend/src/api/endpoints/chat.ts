import { apiClient } from "@/api/client";
import type { Chat, ChatListItem, Message, TestChatResponse } from "@/api/types/chat";
import type { ApiResponse, PaginatedResponse } from "@/api/types/common";

export async function fetchChats(
  page: number = 1,
  perPage: number = 20,
): Promise<PaginatedResponse<ChatListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<ChatListItem>>(
    "/chats",
    { params: { page, per_page: perPage } },
  );
  return data;
}

export async function fetchChat(chatId: number): Promise<ApiResponse<Chat>> {
  const { data } = await apiClient.get<ApiResponse<Chat>>(`/chats/${chatId}`);
  return data;
}

export async function sendOperatorMessage(
  chatId: number,
  content: string,
): Promise<ApiResponse<Message>> {
  const { data } = await apiClient.post<ApiResponse<Message>>(
    `/chats/${chatId}/messages`,
    { content },
  );
  return data;
}

export async function toggleBotControl(
  chatId: number,
  isBot: boolean,
): Promise<ApiResponse<Chat>> {
  const { data } = await apiClient.patch<ApiResponse<Chat>>(
    `/chats/${chatId}/bot-control`,
    { is_controlled_by_bot: isBot },
  );
  return data;
}

export async function createTestChat(): Promise<ApiResponse<Chat>> {
  const { data } = await apiClient.post<ApiResponse<Chat>>("/flow/test-chat");
  return data;
}

export async function sendTestMessage(
  chatId: number,
  content: string,
): Promise<ApiResponse<TestChatResponse>> {
  const { data } = await apiClient.post<ApiResponse<TestChatResponse>>(
    `/flow/test-chat/${chatId}/message`,
    { content },
  );
  return data;
}

export async function deleteTestChat(
  chatId: number,
): Promise<ApiResponse<null>> {
  const { data } = await apiClient.delete<ApiResponse<null>>(
    `/flow/test-chat/${chatId}`,
  );
  return data;
}
