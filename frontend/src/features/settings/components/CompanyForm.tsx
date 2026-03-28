import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  CompanySettings,
  CompanySettingsUpdate,
  ModelInfo,
} from "@/api/types/settings";
import { fetchModels } from "@/api/endpoints/settings";

interface CompanyFormProps {
  readonly settings: CompanySettings;
  readonly onSave: (payload: CompanySettingsUpdate) => Promise<void>;
}

const DEBOUNCE_MS = 800;
const MIN_KEY_LENGTH = 20;

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
  const [embeddingModel, setEmbeddingModel] = useState<string>(
    settings.ai_embedding_model,
  );
  const [apiKey, setApiKey] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [dirty, setDirty] = useState<boolean>(false);

  const [chatModels, setChatModels] = useState<readonly ModelInfo[]>([]);
  const [embeddingModels, setEmbeddingModels] = useState<readonly ModelInfo[]>(
    [],
  );
  const [modelsLoading, setModelsLoading] = useState<boolean>(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const initialLoadDone = useRef<boolean>(false);

  useEffect(() => {
    setName(settings.company_name);
    setDescription(settings.company_description ?? "");
    setProvider(settings.ai_provider);
    setModel(settings.ai_model);
    setEmbeddingModel(settings.ai_embedding_model);
    setApiKey("");
    setDirty(false);
  }, [settings]);

  const loadModels = useCallback(async (keyOverride?: string): Promise<void> => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const response = await fetchModels(keyOverride);
      if (response.data) {
        setChatModels(response.data.chat_models);
        setEmbeddingModels(response.data.embedding_models);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load models";
      setModelsError(message);
      setChatModels([]);
      setEmbeddingModels([]);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  // Load models on mount if API key is already configured
  useEffect(() => {
    if (settings.ai_api_key_set && !initialLoadDone.current) {
      initialLoadDone.current = true;
      void loadModels();
    }
  }, [settings.ai_api_key_set, loadModels]);

  // Debounced load when user types a new API key
  useEffect(() => {
    if (!apiKey || apiKey.length < MIN_KEY_LENGTH) return;
    const timer = setTimeout(() => {
      void loadModels(apiKey);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [apiKey, loadModels]);

  function markDirty(): void {
    setDirty(true);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: CompanySettingsUpdate = {
        company_name: name,
        company_description: description || null,
        ai_provider: provider,
        ai_model: model,
        ai_embedding_model: embeddingModel,
      };
      // Only send api_key if user typed a new one
      if (apiKey) {
        (payload as Record<string, unknown>)["ai_api_key"] = apiKey;
      }
      await onSave(payload);
      setApiKey("");
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  const selectClass =
    "h-10 w-full appearance-none rounded-lg border border-[var(--app-border)] bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[position:right_12px_center] bg-no-repeat pl-3 pr-9 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)] disabled:opacity-50";

  const showModelSelectors = chatModels.length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--app-font-primary)]">
          Company Name
        </label>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            markDirty();
          }}
          className="h-10 w-full rounded-lg border border-[var(--app-border)] bg-white px-3 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--app-font-primary)]">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            markDirty();
          }}
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
          onChange={(e) => {
            setProvider(e.target.value);
            markDirty();
          }}
          className={selectClass}
        >
          <option value="openai">OpenAI</option>
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--app-font-primary)]">
          API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            markDirty();
          }}
          placeholder={
            settings.ai_api_key_set
              ? "••••••••  (key is set, enter new to replace)"
              : "Enter your OpenAI API key"
          }
          className="h-10 w-full rounded-lg border border-[var(--app-border)] bg-white px-3 text-sm text-[var(--app-font-primary)] outline-none focus:border-[var(--app-primary)]"
        />
        {settings.ai_api_key_set && (
          <p className="mt-1 flex items-center gap-2 text-xs text-[var(--app-success)]">
            <span>API key is configured</span>
            <button
              type="button"
              onClick={() => {
                setChatModels([]);
                setEmbeddingModels([]);
                setModelsError(null);
                void onSave({ ai_api_key: "" });
              }}
              className="text-[var(--app-error)] underline hover:no-underline"
            >
              Remove key
            </button>
          </p>
        )}
        {!settings.ai_api_key_set && (
          <p className="mt-1 text-xs text-[var(--app-warning)]">
            API key is not set — AI features will not work
          </p>
        )}
        {modelsLoading && (
          <p className="mt-1 text-xs text-[var(--app-font-muted)]">
            Validating key and loading models...
          </p>
        )}
        {modelsError != null && !modelsLoading && (
          <p className="mt-1 text-xs text-[var(--app-error)]">{modelsError}</p>
        )}
      </div>

      {showModelSelectors && (
        <>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--app-font-primary)]">
              AI Model
            </label>
            <select
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                markDirty();
              }}
              className={selectClass}
            >
              {chatModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--app-font-primary)]">
              Embedding Model
            </label>
            <select
              value={embeddingModel}
              onChange={(e) => {
                setEmbeddingModel(e.target.value);
                markDirty();
              }}
              className={selectClass}
            >
              {embeddingModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="flex justify-end">
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
