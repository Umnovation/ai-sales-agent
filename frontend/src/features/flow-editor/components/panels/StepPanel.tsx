import { type FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FlowScriptStep, StepUpdateRequest } from "@/api/types/flow";

interface StepPanelProps {
  readonly step: FlowScriptStep;
  readonly scriptId: number;
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
  allSteps,
  onUpdate,
  onDelete,
  onClose,
}: StepPanelProps): React.ReactElement {
  const [title, setTitle] = useState<string>(step.title);
  const [task, setTask] = useState<string>(step.task);
  const [criteria, setCriteria] = useState<string>(step.completion_criteria ?? "");
  const [maxAttempts, setMaxAttempts] = useState<number>(step.max_attempts);
  const [order, setOrder] = useState<number>(step.order);
  const [successStepId, setSuccessStepId] = useState<number | null>(step.success_step_id);
  const [failStepId, setFailStepId] = useState<number | null>(step.fail_step_id);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    setTitle(step.title);
    setTask(step.task);
    setCriteria(step.completion_criteria ?? "");
    setMaxAttempts(step.max_attempts);
    setOrder(step.order);
    setSuccessStepId(step.success_step_id);
    setFailStepId(step.fail_step_id);
  }, [step]);

  async function handleSave(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdate(scriptId, step.id, {
        title,
        task,
        completion_criteria: criteria || null,
        max_attempts: maxAttempts,
        order,
        success_step_id: successStepId,
        fail_step_id: failStepId,
      });
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
        <button
          onClick={onClose}
          className="rounded p-1 text-[var(--app-font-muted)] transition-colors hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-font-primary)]"
        >
          <X size={16} />
        </button>
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
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-[var(--app-font-secondary)]">
                Order
              </label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                min={1}
                className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-white px-3 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
              />
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
            onClick={() => void onDelete(scriptId, step.id)}
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
