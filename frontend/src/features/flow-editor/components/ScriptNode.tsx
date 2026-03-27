import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Settings, Plus, RefreshCw, Check, X } from "lucide-react";
import type { FlowScript, FlowScriptStep } from "@/api/types/flow";

interface ScriptNodeData {
  readonly script: FlowScript;
  readonly isSelected: boolean;
  readonly selectedStepId: number | null;
  readonly onSelectScript: (scriptId: number) => void;
  readonly onSelectStep: (stepId: number, scriptId: number) => void;
  readonly onAddStep: (scriptId: number) => void;
  [key: string]: unknown;
}

function ScriptNodeComponent({ data }: NodeProps): React.ReactElement {
  const {
    script,
    isSelected,
    selectedStepId,
    onSelectScript,
    onSelectStep,
    onAddStep,
  } = data as unknown as ScriptNodeData;

  const sortedSteps: readonly FlowScriptStep[] = [...script.steps].sort(
    (a, b) => a.order - b.order,
  );

  return (
    <div
      className={`w-[260px] rounded-xl bg-white ${
        isSelected ? "ring-2 ring-[var(--app-primary)]/20" : ""
      }`}
      style={{
        border: "1px solid var(--app-border)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* Hidden handles */}
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-none !bg-transparent !opacity-0" />
      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-none !bg-transparent !opacity-0" />

      {/* Header: START badge + name */}
      <div
        className="cursor-pointer px-4 pt-4 pb-1"
        onClick={() => onSelectScript(script.id)}
      >
        <div className="flex items-center gap-2">
          {script.is_starting_script && (
            <span className="rounded bg-[var(--app-success)] px-2 py-[2px] text-[9px] font-bold uppercase tracking-wide text-white">
              Start
            </span>
          )}
          <span className="text-[15px] font-bold text-[var(--app-font-primary)]">
            {script.name}
          </span>
        </div>
      </div>

      {/* Description + meta */}
      <div className="px-4 pb-2.5">
        {script.description && (
          <p className="mb-0.5 truncate text-[12px] text-[var(--app-font-secondary)]">
            {script.description}
          </p>
        )}
        <p className="text-[11px] text-[var(--app-font-muted)]">
          {script.steps.length} steps &nbsp;|&nbsp; Priority: {script.priority}
        </p>
      </div>

      {/* Separator */}
      <div className="mx-4 border-t border-[var(--app-border-light)]" />

      {/* Steps list — each step is a mini card */}
      <div className="px-3 py-2.5">
        {sortedSteps.length === 0 ? (
          <p className="py-3 text-center text-[11px] text-[var(--app-font-muted)]">
            No steps yet
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {sortedSteps.map((step) => (
              <div key={step.id} className="relative">
                {/* Per-step handles for edge connections */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`step-${step.id}-source`}
                  className="!h-2 !w-2 !border-none !bg-transparent !opacity-0"
                  style={{ top: "50%" }}
                />
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`step-${step.id}-target`}
                  className="!h-2 !w-2 !border-none !bg-transparent !opacity-0"
                  style={{ top: "50%" }}
                />
                <button
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                    selectedStepId === step.id
                      ? "border-[var(--app-primary)]/20 bg-indigo-50/60"
                      : "border-[var(--app-border-light)] bg-[var(--app-bg-page)] hover:bg-[var(--app-hover-bg)]"
                  }`}
                  onClick={() => onSelectStep(step.id, script.id)}
                >
                  {/* Step number circle */}
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-[var(--app-border)] bg-white text-[10px] font-semibold text-[var(--app-font-secondary)]">
                    {step.order}
                  </div>

                  {/* Step title */}
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--app-font-primary)]">
                    {step.title}
                  </span>

                  {/* Retry indicator */}
                  <div className="flex flex-shrink-0 items-center gap-0.5 text-[10px] text-[var(--app-font-muted)]">
                    <RefreshCw size={9} />
                    <span>x{step.max_attempts === -1 ? "∞" : step.max_attempts}</span>
                    {step.success_step_id !== null && (
                      <Check size={10} className="ml-0.5 text-[var(--app-success)]" />
                    )}
                    {step.fail_step_id !== null && (
                      <X size={10} className="text-[var(--app-error)]" />
                    )}
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom: gear + plus */}
      <div className="flex items-center justify-end gap-0.5 border-t border-[var(--app-border-light)] px-3 py-2">
        <button
          className="rounded-lg p-1.5 text-[var(--app-font-muted)] transition-colors hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-font-primary)]"
          onClick={() => onSelectScript(script.id)}
        >
          <Settings size={14} />
        </button>
        <button
          className="rounded-lg p-1.5 text-[var(--app-font-muted)] transition-colors hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-font-primary)]"
          onClick={() => onAddStep(script.id)}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

export const ScriptNode = memo(ScriptNodeComponent);
