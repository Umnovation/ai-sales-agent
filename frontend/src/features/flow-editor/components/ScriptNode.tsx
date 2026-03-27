import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Settings, Plus, ArrowDown, RefreshCw, Check, X } from "lucide-react";
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
      className={`min-w-[260px] max-w-[280px] rounded-xl border-2 bg-white shadow-md transition-colors ${
        isSelected
          ? "border-[var(--app-primary)] shadow-lg"
          : "border-[var(--app-border)]"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-[var(--app-primary)]" />
      <Handle type="source" position={Position.Right} className="!bg-[var(--app-primary)]" />

      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between rounded-t-[10px] border-b border-[var(--app-border-light)] px-4 py-3"
        onClick={() => onSelectScript(script.id)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--app-font-primary)]">
            {script.name}
          </span>
          {script.is_starting_script && (
            <span className="rounded bg-[var(--app-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
              START
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="rounded p-1 text-[var(--app-font-muted)] transition-colors hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-font-primary)]"
            onClick={(e) => {
              e.stopPropagation();
              onSelectScript(script.id);
            }}
          >
            <Settings size={14} />
          </button>
          <button
            className="rounded p-1 text-[var(--app-font-muted)] transition-colors hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-font-primary)]"
            onClick={(e) => {
              e.stopPropagation();
              onAddStep(script.id);
            }}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Description */}
      {script.description && (
        <div className="border-b border-[var(--app-border-light)] px-4 py-2">
          <p className="truncate text-xs text-[var(--app-font-secondary)]">
            {script.description}
          </p>
        </div>
      )}

      {/* Meta */}
      <div className="border-b border-[var(--app-border-light)] px-4 py-1.5">
        <span className="text-[10px] text-[var(--app-font-muted)]">
          {script.steps.length} steps &nbsp;|&nbsp; Priority: {script.priority}
        </span>
      </div>

      {/* Steps list */}
      <div className="px-3 py-2">
        {sortedSteps.length === 0 ? (
          <p className="py-2 text-center text-xs text-[var(--app-font-muted)]">
            No steps yet
          </p>
        ) : (
          <div className="flex flex-col">
            {sortedSteps.map((step, index) => (
              <div key={step.id}>
                <button
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
                    selectedStepId === step.id
                      ? "bg-[var(--app-primary)]/5 ring-1 ring-[var(--app-primary)]/30"
                      : "hover:bg-[var(--app-hover-bg)]"
                  }`}
                  onClick={() => onSelectStep(step.id, script.id)}
                >
                  {/* Step number */}
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--app-primary)] text-[10px] font-bold text-white">
                    {step.order}
                  </div>

                  {/* Step info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[var(--app-font-primary)]">
                      {step.title}
                    </p>
                  </div>

                  {/* Indicators */}
                  <div className="flex items-center gap-1">
                    <span className="flex items-center gap-0.5 text-[10px] text-[var(--app-font-muted)]">
                      <RefreshCw size={9} />
                      {step.max_attempts}
                    </span>
                    {step.success_step_id !== null && (
                      <Check size={12} className="text-[var(--app-success)]" />
                    )}
                    {step.fail_step_id !== null && (
                      <X size={12} className="text-[var(--app-error)]" />
                    )}
                  </div>
                </button>

                {/* Arrow between steps */}
                {index < sortedSteps.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown size={12} className="text-[var(--app-border)]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const ScriptNode = memo(ScriptNodeComponent);
