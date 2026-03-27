import { useCallback, useEffect, useState } from "react";
import * as flowApi from "@/api/endpoints/flow";
import type {
  Flow,
  FlowScript,
  FlowScriptStep,
  ScriptCreateRequest,
  ScriptUpdateRequest,
  StepCreateRequest,
  StepUpdateRequest,
} from "@/api/types/flow";

interface FlowEditorState {
  readonly flow: Flow | null;
  readonly loading: boolean;
  readonly selectedScriptId: number | null;
  readonly selectedStepId: number | null;
  readonly panelMode: "none" | "script" | "step";
}

interface FlowEditorActions {
  readonly reload: () => Promise<void>;
  readonly selectScript: (scriptId: number) => void;
  readonly selectStep: (stepId: number, scriptId: number) => void;
  readonly closePanel: () => void;
  readonly updateFlowName: (name: string) => Promise<void>;
  readonly createScript: (payload: ScriptCreateRequest) => Promise<void>;
  readonly updateScript: (scriptId: number, payload: ScriptUpdateRequest) => Promise<void>;
  readonly deleteScript: (scriptId: number) => Promise<void>;
  readonly updateScriptPosition: (scriptId: number, x: number, y: number) => Promise<void>;
  readonly createStep: (scriptId: number, payload: StepCreateRequest) => Promise<void>;
  readonly updateStep: (scriptId: number, stepId: number, payload: StepUpdateRequest) => Promise<void>;
  readonly deleteStep: (scriptId: number, stepId: number) => Promise<void>;
  readonly getSelectedScript: () => FlowScript | null;
  readonly getSelectedStep: () => FlowScriptStep | null;
  readonly getAllSteps: () => readonly { step: FlowScriptStep; scriptName: string }[];
}

export type FlowEditor = FlowEditorState & FlowEditorActions;

export function useFlowEditor(): FlowEditor {
  const [flow, setFlow] = useState<Flow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedScriptId, setSelectedScriptId] = useState<number | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<number | null>(null);
  const [panelMode, setPanelMode] = useState<"none" | "script" | "step">("none");

  const reload = useCallback(async (): Promise<void> => {
    try {
      const response = await flowApi.getFlow();
      if (response.data) {
        setFlow(response.data);
      }
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selectScript = useCallback((scriptId: number): void => {
    setSelectedScriptId(scriptId);
    setSelectedStepId(null);
    setPanelMode("script");
  }, []);

  const selectStep = useCallback((stepId: number, scriptId: number): void => {
    setSelectedScriptId(scriptId);
    setSelectedStepId(stepId);
    setPanelMode("step");
  }, []);

  const closePanel = useCallback((): void => {
    setSelectedScriptId(null);
    setSelectedStepId(null);
    setPanelMode("none");
  }, []);

  const updateFlowName = useCallback(async (name: string): Promise<void> => {
    await flowApi.updateFlow({ name });
    await reload();
  }, [reload]);

  const createScript = useCallback(async (payload: ScriptCreateRequest): Promise<void> => {
    await flowApi.createScript(payload);
    await reload();
  }, [reload]);

  const updateScript = useCallback(async (scriptId: number, payload: ScriptUpdateRequest): Promise<void> => {
    await flowApi.updateScript(scriptId, payload);
    await reload();
  }, [reload]);

  const deleteScript = useCallback(async (scriptId: number): Promise<void> => {
    await flowApi.deleteScript(scriptId);
    closePanel();
    await reload();
  }, [reload, closePanel]);

  const updateScriptPosition = useCallback(async (scriptId: number, x: number, y: number): Promise<void> => {
    await flowApi.updateScriptPosition(scriptId, { position_x: x, position_y: y });
  }, []);

  const createStep = useCallback(async (scriptId: number, payload: StepCreateRequest): Promise<void> => {
    await flowApi.createStep(scriptId, payload);
    await reload();
  }, [reload]);

  const updateStep = useCallback(async (scriptId: number, stepId: number, payload: StepUpdateRequest): Promise<void> => {
    await flowApi.updateStep(scriptId, stepId, payload);
    await reload();
  }, [reload]);

  const deleteStep = useCallback(async (scriptId: number, stepId: number): Promise<void> => {
    await flowApi.deleteStep(scriptId, stepId);
    closePanel();
    await reload();
  }, [reload, closePanel]);

  const getSelectedScript = useCallback((): FlowScript | null => {
    if (!flow || selectedScriptId === null) return null;
    return flow.scripts.find((s) => s.id === selectedScriptId) ?? null;
  }, [flow, selectedScriptId]);

  const getSelectedStep = useCallback((): FlowScriptStep | null => {
    const script = getSelectedScript();
    if (!script || selectedStepId === null) return null;
    return script.steps.find((s) => s.id === selectedStepId) ?? null;
  }, [getSelectedScript, selectedStepId]);

  const getAllSteps = useCallback((): readonly { step: FlowScriptStep; scriptName: string }[] => {
    if (!flow) return [];
    return flow.scripts.flatMap((script) =>
      script.steps.map((step) => ({ step, scriptName: script.name })),
    );
  }, [flow]);

  return {
    flow,
    loading,
    selectedScriptId,
    selectedStepId,
    panelMode,
    reload,
    selectScript,
    selectStep,
    closePanel,
    updateFlowName,
    createScript,
    updateScript,
    deleteScript,
    updateScriptPosition,
    createStep,
    updateStep,
    deleteStep,
    getSelectedScript,
    getSelectedStep,
    getAllSteps,
  };
}
