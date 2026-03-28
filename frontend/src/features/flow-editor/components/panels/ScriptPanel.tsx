import { type FormEvent, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { FlowScript, ScriptUpdateRequest } from "@/api/types/flow";

interface ScriptPanelProps {
  readonly script: FlowScript;
  readonly onUpdate: (scriptId: number, payload: ScriptUpdateRequest) => Promise<void>;
  readonly onDelete: (scriptId: number) => Promise<void>;
  readonly onClose: () => void;
}

export function ScriptPanel({
  script,
  onUpdate,
  onDelete,
  onClose,
}: ScriptPanelProps): React.ReactElement {
  const [name, setName] = useState<string>(script.name);
  const [description, setDescription] = useState<string>(script.description ?? "");
  const [criteria, setCriteria] = useState<string>(script.transition_criteria ?? "");
  const [isStarting, setIsStarting] = useState<boolean>(script.is_starting_script);
  const [priority, setPriority] = useState<number>(script.priority);
  const [saving, setSaving] = useState<boolean>(false);
  const skipSyncRef = useRef<boolean>(false);

  useEffect(() => {
    // Don't overwrite local state right after save (wait for next real prop change)
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    setName(script.name);
    setDescription(script.description ?? "");
    setCriteria(script.transition_criteria ?? "");
    setIsStarting(script.is_starting_script);
    setPriority(script.priority);
  }, [script.id, script.name, script.description, script.transition_criteria, script.is_starting_script, script.priority]);

  async function handleSave(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSaving(true);
    skipSyncRef.current = true;
    try {
      await onUpdate(script.id, {
        name,
        description: description || null,
        transition_criteria: criteria || null,
        is_starting_script: isStarting,
        priority,
      });
      toast.success("Script saved");
    } catch {
      toast.error("Failed to save script");
      skipSyncRef.current = false;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    try {
      await onDelete(script.id);
      // silent success — node removed from canvas is sufficient feedback
    } catch {
      toast.error("Failed to delete script");
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--app-border)] px-5">
        <h2 className="text-sm font-semibold text-[var(--app-font-primary)]">
          Script
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
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-white px-3 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--app-font-secondary)]">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--app-border)] bg-white px-3 py-2 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--app-font-secondary)]">
              Acceptance Criteria
            </label>
            <textarea
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              rows={3}
              placeholder="e.g., Client expresses frustration or negativity"
              className="w-full resize-none rounded-lg border border-[var(--app-border)] bg-white px-3 py-2 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--app-font-secondary)]">
              Starting Script
            </label>
            <button
              type="button"
              onClick={() => setIsStarting(!isStarting)}
              className={`h-5 w-9 rounded-full transition-colors ${
                isStarting ? "bg-[var(--app-primary)]" : "bg-[var(--app-border)]"
              }`}
            >
              <div
                className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  isStarting ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--app-font-secondary)]">
              Priority
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-white px-3 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between border-t border-[var(--app-border)] pt-5">
          <Button
            type="button"
            variant="ghost"
            className="text-[var(--app-error)] hover:bg-red-50 hover:text-[var(--app-error)]"
            onClick={() => void handleDelete()}
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
