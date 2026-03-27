import { useCallback, useEffect, useState } from "react";
import * as settingsApi from "@/api/endpoints/settings";
import type {
  CompanySettings,
  CompanySettingsUpdate,
  Context,
  ContextCreate,
  DocumentInfo,
} from "@/api/types/settings";
import { CompanyForm } from "./components/CompanyForm";
import { ContextList } from "./components/ContextList";
import { DocumentUpload } from "./components/DocumentUpload";

type SettingsTab = "general" | "rules" | "documents";

const TABS: readonly { id: SettingsTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "rules", label: "Rules" },
  { id: "documents", label: "Documents" },
] as const;

export function SettingsPage(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const [settingsRes, contextsRes, docsRes] = await Promise.all([
          settingsApi.getSettings(),
          settingsApi.listContexts(),
          settingsApi.listDocuments(),
        ]);
        if (settingsRes.data) setSettings(settingsRes.data);
        if (contextsRes.data) setContexts([...contextsRes.data]);
        if (docsRes.data) setDocuments([...docsRes.data]);
      } catch {
        // handled by interceptor
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const handleSaveSettings = useCallback(
    async (payload: CompanySettingsUpdate): Promise<void> => {
      const response = await settingsApi.updateSettings(payload);
      if (response.data) {
        setSettings(response.data);
      }
    },
    [],
  );

  const handleAddContext = useCallback(
    async (payload: ContextCreate): Promise<void> => {
      const response = await settingsApi.createContext(payload);
      if (response.data) {
        setContexts((prev) => [...prev, response.data!]);
      }
    },
    [],
  );

  const handleDeleteContext = useCallback(async (id: number): Promise<void> => {
    await settingsApi.deleteContext(id);
    setContexts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleDocumentUpload = useCallback((doc: DocumentInfo): void => {
    setDocuments((prev) => [doc, ...prev]);
  }, []);

  const handleDeleteDocument = useCallback(
    async (id: number): Promise<void> => {
      await settingsApi.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    },
    [],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[var(--app-font-muted)]">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-[var(--app-font-primary)]">
        Settings
      </h1>

      {/* Tabs */}
      <div className="mb-8 flex border-b border-[var(--app-border)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-4 pb-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-[var(--app-primary)] text-[var(--app-primary)]"
                : "border-transparent text-[var(--app-font-secondary)] hover:text-[var(--app-font-primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "general" && settings && (
        <CompanyForm settings={settings} onSave={handleSaveSettings} />
      )}

      {activeTab === "rules" && (
        <ContextList
          contexts={contexts}
          onAdd={handleAddContext}
          onDelete={handleDeleteContext}
        />
      )}

      {activeTab === "documents" && (
        <DocumentUpload
          documents={documents}
          onUpload={handleDocumentUpload}
          onDelete={handleDeleteDocument}
        />
      )}
    </div>
  );
}
