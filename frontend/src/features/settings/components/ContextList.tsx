import { useState } from "react";
import { Plus, Pencil, Trash2, Shield, CircleAlert, ChevronDown, Check, X } from "lucide-react";
import type { Context, ContextCreate } from "@/api/types/settings";

interface ContextListProps {
  readonly contexts: readonly Context[];
  readonly onAdd: (payload: ContextCreate) => Promise<void>;
  readonly onEdit: (id: number, text: string) => Promise<void>;
  readonly onDelete: (id: number) => Promise<void>;
}

export function ContextList({
  contexts,
  onAdd,
  onEdit,
  onDelete,
}: ContextListProps): React.ReactElement {
  const [showAddDialog, setShowAddDialog] = useState<boolean>(false);
  const [addType, setAddType] = useState<"rule" | "restriction">("rule");
  const [addText, setAddText] = useState<string>("");
  const [adding, setAdding] = useState<boolean>(false);
  const [rulesOpen, setRulesOpen] = useState<boolean>(true);
  const [restrictionsOpen, setRestrictionsOpen] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>("");

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

  function startEdit(context: Context): void {
    setEditingId(context.id);
    setEditText(context.text);
  }

  async function saveEdit(): Promise<void> {
    if (editingId === null || !editText.trim()) return;
    await onEdit(editingId, editText.trim());
    setEditingId(null);
    setEditText("");
  }

  function cancelEdit(): void {
    setEditingId(null);
    setEditText("");
  }

  function renderItem(item: Context): React.ReactElement {
    const isEditing: boolean = editingId === item.id;

    return (
      <div key={item.id} className="flex items-start gap-2.5">
        {isEditing ? (
          <div className="flex-1 rounded-lg border border-[var(--app-primary)] bg-white px-3 py-3.5">
            <textarea
              value={editText}
              onChange={(e) => {
                setEditText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") cancelEdit();
              }}
              ref={(el) => {
                if (el) {
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }
              }}
              className="w-full resize-none overflow-hidden bg-transparent text-[13px] leading-relaxed text-[var(--app-font-primary)] outline-none"
              autoFocus
            />
          </div>
        ) : (
          <div className="flex-1 rounded-lg border border-[var(--app-border)] bg-[#F1F5F9] px-3 py-3.5">
            <p className="text-[13px] leading-relaxed text-[var(--app-font-primary)]">
              {item.text}
            </p>
          </div>
        )}

        {isEditing ? (
          <>
            <button
              onClick={() => void saveEdit()}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-[var(--app-success)] transition-colors hover:bg-green-100"
            >
              <Check size={14} />
            </button>
            <button
              onClick={cancelEdit}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--app-border)] text-[var(--app-font-muted)] transition-colors hover:bg-[var(--app-hover-bg)]"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => startEdit(item)}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--app-border)] text-[var(--app-font-muted)] transition-colors hover:bg-[var(--app-hover-bg)]"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => void onDelete(item.id)}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-[var(--app-error)] transition-colors hover:bg-red-100"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Rules Section */}
      <div className="rounded-xl border border-[var(--app-border)] bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Shield size={18} className="text-[var(--app-primary)]" />
            <span className="text-[15px] font-semibold text-[var(--app-font-primary)]">
              Rules
            </span>
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--app-accent-left)] px-2 text-[10px] font-semibold text-white">
              {rules.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setAddType("rule"); setShowAddDialog(true); }}
              className="flex items-center gap-1 rounded-md bg-[var(--app-accent-left)] px-2.5 py-1 text-[12px] font-medium text-white transition-colors hover:bg-[var(--app-primary-light)]"
            >
              <Plus size={12} />
              Add
            </button>
            <button
              onClick={() => setRulesOpen(!rulesOpen)}
              className={`rounded p-1 text-[var(--app-font-muted)] transition-transform ${rulesOpen ? "" : "-rotate-90"}`}
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </div>

        {rulesOpen && (
          <>
            <div className="mx-0 h-px bg-[var(--app-border)]" />
            <div className="flex flex-col gap-2.5 p-3">
              {rules.length === 0 ? (
                <p className="py-4 text-center text-[12px] text-[var(--app-font-muted)]">
                  No rules added yet
                </p>
              ) : (
                rules.map((rule) => renderItem(rule))
              )}
            </div>
          </>
        )}
      </div>

      {/* Restrictions Section */}
      <div className="rounded-xl border border-[var(--app-border)] bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <CircleAlert size={18} className="text-[var(--app-error)]" />
            <span className="text-[15px] font-semibold text-[var(--app-font-primary)]">
              Restrictions
            </span>
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--app-error)] px-2 text-[10px] font-semibold text-white">
              {restrictions.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setAddType("restriction"); setShowAddDialog(true); }}
              className="flex items-center gap-1 rounded-md bg-[var(--app-accent-left)] px-2.5 py-1 text-[12px] font-medium text-white transition-colors hover:bg-[var(--app-primary-light)]"
            >
              <Plus size={12} />
              Add
            </button>
            <button
              onClick={() => setRestrictionsOpen(!restrictionsOpen)}
              className={`rounded p-1 text-[var(--app-font-muted)] transition-transform ${restrictionsOpen ? "" : "-rotate-90"}`}
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </div>

        {restrictionsOpen && (
          <>
            <div className="mx-0 h-px bg-[var(--app-border)]" />
            <div className="flex flex-col gap-2.5 p-3">
              {restrictions.length === 0 ? (
                <p className="py-4 text-center text-[12px] text-[var(--app-font-muted)]">
                  No restrictions added yet
                </p>
              ) : (
                restrictions.map((restriction) => renderItem(restriction))
              )}
            </div>
          </>
        )}
      </div>

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[440px] rounded-xl border border-[var(--app-border)] bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-[14px] font-semibold text-[var(--app-font-primary)]">
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
              className="mb-4 w-full resize-none rounded-lg border border-[var(--app-border)] bg-white px-3 py-2.5 text-[13px] text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowAddDialog(false); setAddText(""); }}
                className="rounded-md border border-[var(--app-border)] px-4 py-2 text-[12px] font-medium text-[var(--app-font-secondary)] transition-colors hover:bg-[var(--app-hover-bg)]"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAdd()}
                disabled={adding || !addText.trim()}
                className="rounded-md bg-[var(--app-primary)] px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-[var(--app-primary-dark)] disabled:opacity-50"
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
