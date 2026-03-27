import { apiClient } from "@/api/client";
import type { LoginRequest, TokenResponse } from "@/api/types/auth";
import type { ApiResponse } from "@/api/types/common";

export async function login(
  payload: LoginRequest,
): Promise<ApiResponse<TokenResponse>> {
  const { data } = await apiClient.post<ApiResponse<TokenResponse>>(
    "/auth/login",
    payload,
  );
  return data;
}

export async function install(payload: {
  email: string;
  password: string;
  name: string;
}): Promise<ApiResponse<TokenResponse>> {
  const { data } = await apiClient.post<ApiResponse<TokenResponse>>(
    "/auth/install",
    payload,
  );
  return data;
}
