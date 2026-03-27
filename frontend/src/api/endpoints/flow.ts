import { apiClient } from "@/api/client";
import type { ApiResponse } from "@/api/types/common";
import type {
  Flow,
  FlowScript,
  FlowScriptStep,
  FlowUpdateRequest,
  ScriptCreateRequest,
  ScriptPositionUpdate,
  ScriptUpdateRequest,
  StepCreateRequest,
  StepUpdateRequest,
} from "@/api/types/flow";

export async function getFlow(): Promise<ApiResponse<Flow>> {
  const { data } = await apiClient.get<ApiResponse<Flow>>("/flow");
  return data;
}

export async function updateFlow(
  payload: FlowUpdateRequest,
): Promise<ApiResponse<Flow>> {
  const { data } = await apiClient.put<ApiResponse<Flow>>("/flow", payload);
  return data;
}

export async function createScript(
  payload: ScriptCreateRequest,
): Promise<ApiResponse<FlowScript>> {
  const { data } = await apiClient.post<ApiResponse<FlowScript>>(
    "/flow/scripts",
    payload,
  );
  return data;
}

export async function updateScript(
  scriptId: number,
  payload: ScriptUpdateRequest,
): Promise<ApiResponse<FlowScript>> {
  const { data } = await apiClient.put<ApiResponse<FlowScript>>(
    `/flow/scripts/${scriptId}`,
    payload,
  );
  return data;
}

export async function updateScriptPosition(
  scriptId: number,
  payload: ScriptPositionUpdate,
): Promise<ApiResponse<FlowScript>> {
  const { data } = await apiClient.patch<ApiResponse<FlowScript>>(
    `/flow/scripts/${scriptId}/position`,
    payload,
  );
  return data;
}

export async function deleteScript(
  scriptId: number,
): Promise<ApiResponse<null>> {
  const { data } = await apiClient.delete<ApiResponse<null>>(
    `/flow/scripts/${scriptId}`,
  );
  return data;
}

export async function createStep(
  scriptId: number,
  payload: StepCreateRequest,
): Promise<ApiResponse<FlowScriptStep>> {
  const { data } = await apiClient.post<ApiResponse<FlowScriptStep>>(
    `/flow/scripts/${scriptId}/steps`,
    payload,
  );
  return data;
}

export async function updateStep(
  scriptId: number,
  stepId: number,
  payload: StepUpdateRequest,
): Promise<ApiResponse<FlowScriptStep>> {
  const { data } = await apiClient.put<ApiResponse<FlowScriptStep>>(
    `/flow/scripts/${scriptId}/steps/${stepId}`,
    payload,
  );
  return data;
}

export async function deleteStep(
  scriptId: number,
  stepId: number,
): Promise<ApiResponse<null>> {
  const { data } = await apiClient.delete<ApiResponse<null>>(
    `/flow/scripts/${scriptId}/steps/${stepId}`,
  );
  return data;
}
