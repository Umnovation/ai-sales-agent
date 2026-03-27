export interface FlowScriptStep {
  readonly id: number;
  readonly flow_script_id: number;
  readonly order: number;
  readonly title: string;
  readonly task: string;
  readonly completion_criteria: string | null;
  readonly max_attempts: number;
  readonly success_step_id: number | null;
  readonly fail_step_id: number | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface FlowScript {
  readonly id: number;
  readonly flow_id: number;
  readonly name: string;
  readonly description: string | null;
  readonly transition_criteria: string | null;
  readonly is_starting_script: boolean;
  readonly priority: number;
  readonly position_x: number | null;
  readonly position_y: number | null;
  readonly steps: readonly FlowScriptStep[];
  readonly created_at: string;
  readonly updated_at: string;
}

export interface Flow {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly is_active: boolean;
  readonly scripts: readonly FlowScript[];
  readonly created_at: string;
  readonly updated_at: string;
}

export interface StepCreateRequest {
  readonly title: string;
  readonly task: string;
  readonly order?: number;
  readonly completion_criteria?: string | null;
  readonly max_attempts?: number;
  readonly success_step_id?: number | null;
  readonly fail_step_id?: number | null;
}

export interface StepUpdateRequest {
  readonly title?: string;
  readonly task?: string;
  readonly order?: number;
  readonly completion_criteria?: string | null;
  readonly max_attempts?: number;
  readonly success_step_id?: number | null;
  readonly fail_step_id?: number | null;
}

export interface ScriptCreateRequest {
  readonly name: string;
  readonly description?: string | null;
  readonly transition_criteria?: string | null;
  readonly is_starting_script?: boolean;
  readonly priority?: number;
  readonly position_x?: number | null;
  readonly position_y?: number | null;
}

export interface ScriptUpdateRequest {
  readonly name?: string;
  readonly description?: string | null;
  readonly transition_criteria?: string | null;
  readonly is_starting_script?: boolean;
  readonly priority?: number;
}

export interface ScriptPositionUpdate {
  readonly position_x: number;
  readonly position_y: number;
}

export interface FlowUpdateRequest {
  readonly name?: string;
  readonly description?: string | null;
  readonly is_active?: boolean;
}
