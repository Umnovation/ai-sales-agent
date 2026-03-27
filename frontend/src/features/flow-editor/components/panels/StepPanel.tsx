import { type FormEvent, useEffect, useRef, useState } from "react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { FlowScriptStep, StepUpdateRequest } from "@/api/types/flow";

interface StepPanelProps {
  readonly step: FlowScriptStep;
  readonly scriptId: number;
  readonly scriptSteps: readonly FlowScriptStep[];
  readonly allSteps: readonly { step: FlowScriptStep; scriptName: string }[];
  readonly onUpdate: (scriptId: number, stepId: number, payload: StepUpdateRequest) => Promise<void>;
  readonly onDelete: (scriptId: number, stepId: number) => Promise<void>;
  readonly onClose: () => void;
}

const MAX_ATTEMPTS_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 5, label: "5" },
  { value: -1, label: "Unlimited" },
] as const;

export function StepPanel({
  step,
  scriptId,
  scriptSteps,
  allSteps,
  onUpdate,
  onDelete,
  onClose,
}: StepPanelProps): React.ReactElement {
  const [title, setTitle] = useState<string>(step.title);
  const [task, setTask] = useState<string>(step.task);
  const [criteria, setCriteria] = useState<string>(step.completion_criteria ?? "");
  const [maxAttempts, setMaxAttempts] = useState<number>(step.max_attempts);
  const [successStepId, setSuccessStepId] = useState<number | null>(step.success_step_id);
  const [failStepId, setFailStepId] = useState<number | null>(step.fail_step_id);
  const [saving, setSaving] = useState<boolean>(false);
  const skipSyncRef = useRef<boolean>(false);

  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    setTitle(step.title);
    setTask(step.task);
    setCriteria(step.completion_criteria ?? "");
    setMaxAttempts(step.max_attempts);
    setSuccessStepId(step.success_step_id);
    setFailStepId(step.fail_step_id);
  }, [step.id, step.title, step.task, step.completion_criteria, step.max_attempts, step.success_step_id, step.fail_step_id]);

  const sorted: readonly FlowScriptStep[] = [...scriptSteps].sort((a, b) => a.order - b.order);
  const currentIndex: number = sorted.findIndex((s) => s.id === step.id);
  const canMoveUp: boolean = currentIndex > 0;
  const canMoveDown: boolean = currentIndex < sorted.length - 1;

  async function handleMoveUp(): Promise<void> {
    if (!canMoveUp) return;
    const neighbor = sorted[currentIndex - 1];
    if (!neighbor) return;
    // Swap orders
    await onUpdate(scriptId, step.id, { order: neighbor.order });
    await onUpdate(scriptId, neighbor.id, { order: step.order });
  }

  async function handleMoveDown(): Promise<void> {
    if (!canMoveDown) return;
    const neighbor = sorted[currentIndex + 1];
    if (!neighbor) return;
    await onUpdate(scriptId, step.id, { order: neighbor.order });
    await onUpdate(scriptId, neighbor.id, { order: step.order });
  }

  async function handleSave(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSaving(true);
    skipSyncRef.current = true;
    try {
      await onUpdate(scriptId, step.id, {
        title,
        task,
        completion_criteria: criteria || null,
        max_attempts: maxAttempts,
        success_step_id: successStepId,
        fail_step_id: failStepId,
      });
      toast.success("Step saved");
    } catch {
      toast.error("Failed to save step");
      skipSyncRef.current = false;
    } finally {
      setSaving(false);
    }
  }

  // Build step options for routing dropdowns
  const stepOptions: readonly { value: number; label: string }[] = allSteps
    .filter((s) => s.step.id !== step.id)
    .map((s) => ({
      value: s.step.id,
      label: `${s.scriptName} → ${s.step.title}`,
    }));

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--app-border)] px-5">
        <h2 className="text-sm font-semibold text-[var(--app-font-primary)]">
          Step
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => void handleMoveUp()}
            disabled={!canMoveUp}
            className="rounded p-1 text-[var(--app-font-muted)] transition-colors hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-font-primary)] disabled:opacity-30"
            title="Move up"
          >
            <ChevronUp size={16} />
          </button>
          <button
            onClick={() => void handleMoveDown()}
            disabled={!canMoveDown}
            className="rounded p-1 text-[var(--app-font-muted)] transition-colors hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-font-primary)] disabled:opacity-30"
            title="Move down"
          >
            <ChevronDown size={16} />
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--app-font-muted)] transition-colors hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-font-primary)]"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-y-auto p-5">
        <div className="flex flex-1 flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--app-font-secondary)]">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-white px-3 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--app-font-secondary)]">
              Step Task
            </label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-[var(--app-border)] bg-white px-3 py-2 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--app-font-secondary)]">
              Completion Criteria
            </label>
            <textarea
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              rows={2}
              placeholder="What counts as step completion?"
              className="w-full resize-none rounded-lg border border-[var(--app-border)] bg-white px-3 py-2 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-[var(--app-font-secondary)]">
                Max Attempts
              </label>
              <select
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-white px-3 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
              >
                {MAX_ATTEMPTS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--app-font-secondary)]">
              Success → Step
            </label>
            <select
              value={successStepId ?? ""}
              onChange={(e) =>
                setSuccessStepId(e.target.value ? Number(e.target.value) : null)
              }
              className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-white px-3 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
            >
              <option value="">Next by order</option>
              {stepOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--app-font-secondary)]">
              Fail → Step
            </label>
            <select
              value={failStepId ?? ""}
              onChange={(e) =>
                setFailStepId(e.target.value ? Number(e.target.value) : null)
              }
              className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-white px-3 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
            >
              <option value="">Next by order</option>
              {stepOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between border-t border-[var(--app-border)] pt-5">
          <Button
            type="button"
            variant="ghost"
            className="text-[var(--app-error)] hover:bg-red-50 hover:text-[var(--app-error)]"
            onClick={() => {
              onDelete(scriptId, step.id)
                .then(() => toast.success("Step deleted"))
                .catch(() => toast.error("Failed to delete step"));
            }}
          >
            Delete
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-[var(--app-primary)] text-white hover:bg-[var(--app-primary-dark)]"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
