import { useState } from "react";
import { Plus, MessageSquare, Settings as SettingsIcon } from "lucide-react";
import { ReactFlowProvider } from "@xyflow/react";
import { FlowCanvas } from "./components/FlowCanvas";
import { ScriptPanel } from "./components/panels/ScriptPanel";
import { StepPanel } from "./components/panels/StepPanel";
import { TestChatDialog } from "./components/TestChatDialog";
import { useFlowEditor } from "./hooks/useFlowEditor";

export function FlowEditorPage(): React.ReactElement {
  const editor = useFlowEditor();
  const [testChatOpen, setTestChatOpen] = useState<boolean>(false);

  const selectedScript = editor.getSelectedScript();
  const selectedStep = editor.getSelectedStep();
  const showPanel: boolean = editor.panelMode !== "none";

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex h-14 items-center border-b border-[var(--app-border)] bg-white px-5">
        {/* Flow name */}
        <h1 className="text-sm font-semibold text-[var(--app-font-primary)]">
          {editor.flow?.name ?? "Loading..."}
        </h1>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              void editor.createScript({
                name: `Script ${(editor.flow?.scripts.length ?? 0) + 1}`,
                position_x: 40 + (editor.flow?.scripts.length ?? 0) * 300,
                position_y: 40,
              })
            }
            className="flex items-center gap-1.5 rounded-md border border-[var(--app-border)] bg-white px-3 py-1.5 text-[12px] font-medium text-[var(--app-font-primary)] transition-colors hover:bg-[var(--app-hover-bg)]"
          >
            <Plus size={12} />
            New Script
          </button>
          <button
            onClick={() => setTestChatOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-[var(--app-primary)] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[var(--app-primary-dark)]"
          >
            <MessageSquare size={12} />
            Test Chat
          </button>
          <button className="rounded-md border border-[var(--app-border)] p-1.5 text-[var(--app-font-muted)] transition-colors hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-font-primary)]">
            <SettingsIcon size={14} />
          </button>
        </div>
      </div>

      {/* Main area: Canvas + Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas — shrinks when panel opens */}
        <div className="flex-1 transition-all duration-200">
          <ReactFlowProvider>
            <FlowCanvas editor={editor} />
          </ReactFlowProvider>
        </div>

        {/* Right Panel (320px) — slides in with animation */}
        <div
          className={`border-l border-[var(--app-border)] bg-white transition-all duration-200 ${
            showPanel ? "w-80" : "w-0 overflow-hidden border-l-0"
          }`}
        >
          <div className="w-80">
            {editor.panelMode === "script" && selectedScript && (
              <ScriptPanel
                script={selectedScript}
                onUpdate={editor.updateScript}
                onDelete={editor.deleteScript}
                onClose={editor.closePanel}
              />
            )}
            {editor.panelMode === "step" && selectedStep && selectedScript && (
              <StepPanel
                step={selectedStep}
                scriptId={selectedScript.id}
                scriptSteps={selectedScript.steps}
                allSteps={editor.getAllSteps()}
                onUpdate={editor.updateStep}
                onDelete={editor.deleteStep}
                onClose={editor.closePanel}
              />
            )}
          </div>
        </div>
      </div>

      {/* Test Chat Dialog */}
      <TestChatDialog
        isOpen={testChatOpen}
        onClose={() => setTestChatOpen(false)}
      />
    </div>
  );
}
