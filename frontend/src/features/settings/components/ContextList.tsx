import { useState } from "react";
import { Plus, Pencil, Trash2, Shield, AlertTriangle } from "lucide-react";
import type { Context, ContextCreate } from "@/api/types/settings";

interface ContextListProps {
  readonly contexts: readonly Context[];
  readonly onAdd: (payload: ContextCreate) => Promise<void>;
  readonly onDelete: (id: number) => Promise<void>;
}

export function ContextList({
  contexts,
  onAdd,
  onDelete,
}: ContextListProps): React.ReactElement {
  const [showAddDialog, setShowAddDialog] = useState<boolean>(false);
  const [addType, setAddType] = useState<"rule" | "restriction">("rule");
  const [addText, setAddText] = useState<string>("");
  const [adding, setAdding] = useState<boolean>(false);

  const rules: readonly Context[] = contexts.filter((c) => c.type === "rule");
  const restrictions: readonly Context[] = contexts.filter(
    (c) => c.type === "restriction",
  );

  async function handleAdd(): Promise<void> {
    if (!addText.trim()) return;
    setAdding(true);
    try {
      await onAdd({ type: addType, text: addText.trim() });
      setAddText("");
      setShowAddDialog(false);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      {/* Rules */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[var(--app-primary)]" />
            <span className="text-sm font-semibold text-[var(--app-font-primary)]">
              Rules
            </span>
            <span className="rounded-full bg-[var(--app-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {rules.length}
            </span>
          </div>
          <button
            onClick={() => { setAddType("rule"); setShowAddDialog(true); }}
            className="flex items-center gap-1 rounded-lg border border-[var(--app-border)] px-2.5 py-1 text-xs font-medium text-[var(--app-font-secondary)] transition-colors hover:bg-[var(--app-hover-bg)]"
          >
            <Plus size={12} />
            Add
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between rounded-lg border border-[var(--app-border)] bg-white px-4 py-3"
            >
              <p className="flex-1 text-sm text-[var(--app-font-primary)]">
                {rule.text}
              </p>
              <div className="ml-3 flex items-center gap-1">
                <button className="rounded p-1 text-[var(--app-font-muted)] transition-colors hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-font-primary)]">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => void onDelete(rule.id)}
                  className="rounded p-1 text-[var(--app-error)] transition-colors hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {rules.length === 0 && (
            <p className="py-3 text-center text-xs text-[var(--app-font-muted)]">
              No rules added yet
            </p>
          )}
        </div>
      </div>

      {/* Restrictions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-[var(--app-error)]" />
            <span className="text-sm font-semibold text-[var(--app-font-primary)]">
              Restrictions
            </span>
            <span className="rounded-full bg-[var(--app-error)] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {restrictions.length}
            </span>
          </div>
          <button
            onClick={() => { setAddType("restriction"); setShowAddDialog(true); }}
            className="flex items-center gap-1 rounded-lg border border-[var(--app-border)] px-2.5 py-1 text-xs font-medium text-[var(--app-font-secondary)] transition-colors hover:bg-[var(--app-hover-bg)]"
          >
            <Plus size={12} />
            Add
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {restrictions.map((restriction) => (
            <div
              key={restriction.id}
              className="flex items-center justify-between rounded-lg border border-[var(--app-border)] bg-white px-4 py-3"
            >
              <p className="flex-1 text-sm text-[var(--app-font-primary)]">
                {restriction.text}
              </p>
              <div className="ml-3 flex items-center gap-1">
                <button className="rounded p-1 text-[var(--app-font-muted)] transition-colors hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-font-primary)]">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => void onDelete(restriction.id)}
                  className="rounded p-1 text-[var(--app-error)] transition-colors hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {restrictions.length === 0 && (
            <p className="py-3 text-center text-xs text-[var(--app-font-muted)]">
              No restrictions added yet
            </p>
          )}
        </div>
      </div>

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[420px] rounded-xl border border-[var(--app-border)] bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-sm font-semibold text-[var(--app-font-primary)]">
              Add {addType === "rule" ? "Rule" : "Restriction"}
            </h3>
            <textarea
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              rows={3}
              placeholder={
                addType === "rule"
                  ? "e.g., Always recommend scheduling a demo call"
                  : "e.g., Do not offer discounts above 20%"
              }
              className="mb-4 w-full resize-none rounded-lg border border-[var(--app-border)] bg-white px-3 py-2.5 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowAddDialog(false); setAddText(""); }}
                className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-xs font-medium text-[var(--app-font-secondary)] transition-colors hover:bg-[var(--app-hover-bg)]"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAdd()}
                disabled={adding || !addText.trim()}
                className="rounded-lg bg-[var(--app-primary)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--app-primary-dark)] disabled:opacity-50"
              >
                {adding ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
