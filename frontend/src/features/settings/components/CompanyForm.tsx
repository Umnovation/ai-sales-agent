import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CompanySettings, CompanySettingsUpdate } from "@/api/types/settings";

interface CompanyFormProps {
  readonly settings: CompanySettings;
  readonly onSave: (payload: CompanySettingsUpdate) => Promise<void>;
}

export function CompanyForm({
  settings,
  onSave,
}: CompanyFormProps): React.ReactElement {
  const [name, setName] = useState<string>(settings.company_name);
  const [description, setDescription] = useState<string>(
    settings.company_description ?? "",
  );
  const [provider, setProvider] = useState<string>(settings.ai_provider);
  const [model, setModel] = useState<string>(settings.ai_model);
  const [saving, setSaving] = useState<boolean>(false);
  const [dirty, setDirty] = useState<boolean>(false);

  useEffect(() => {
    setName(settings.company_name);
    setDescription(settings.company_description ?? "");
    setProvider(settings.ai_provider);
    setModel(settings.ai_model);
    setDirty(false);
  }, [settings]);

  function markDirty(): void {
    setDirty(true);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        company_name: name,
        company_description: description || null,
        ai_provider: provider,
        ai_model: model,
      });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--app-font-primary)]">
          Company Name
        </label>
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); markDirty(); }}
          className="h-10 w-full rounded-lg border border-[var(--app-border)] bg-white px-3 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--app-font-primary)]">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => { setDescription(e.target.value); markDirty(); }}
          rows={3}
          className="w-full resize-none rounded-lg border border-[var(--app-border)] bg-white px-3 py-2.5 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--app-font-primary)]">
          AI Provider
        </label>
        <select
          value={provider}
          onChange={(e) => { setProvider(e.target.value); markDirty(); }}
          className="h-10 w-full rounded-lg border border-[var(--app-border)] bg-white px-3 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
        >
          <option value="openai">OpenAI</option>
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--app-font-primary)]">
          AI Model
        </label>
        <select
          value={model}
          onChange={(e) => { setModel(e.target.value); markDirty(); }}
          className="h-10 w-full rounded-lg border border-[var(--app-border)] bg-white px-3 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
        >
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4o-mini">GPT-4o Mini</option>
          <option value="gpt-4.1">GPT-4.1</option>
        </select>
      </div>

      <div className="flex justify-center">
        <Button
          type="submit"
          disabled={saving || !dirty}
          className="bg-[var(--app-primary)] px-6 text-white hover:bg-[var(--app-primary-dark)] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
