import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type NodeTypes,
  type EdgeTypes,
  type OnNodesChange,
  applyNodeChanges,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ScriptNode } from "./ScriptNode";
import { FlowEdge } from "./FlowEdge";
import { useFlowConnections } from "../hooks/useFlowConnections";
import type { FlowEditor } from "../hooks/useFlowEditor";

interface FlowCanvasProps {
  readonly editor: FlowEditor;
}

const nodeTypes: NodeTypes = {
  scriptNode: ScriptNode,
};

const edgeTypes: EdgeTypes = {
  flowEdge: FlowEdge,
};

export function FlowCanvas({ editor }: FlowCanvasProps): React.ReactElement {
  const { flow, selectedScriptId, selectedStepId } = editor;
  const edges = useFlowConnections(flow);

  const nodes: Node[] = useMemo((): Node[] => {
    if (!flow) return [];
    return flow.scripts.map((script) => ({
      id: `script-${script.id}`,
      type: "scriptNode",
      position: {
        x: script.position_x ?? 0,
        y: script.position_y ?? 0,
      },
      data: {
        script,
        isSelected: selectedScriptId === script.id,
        selectedStepId,
        onSelectScript: editor.selectScript,
        onSelectStep: editor.selectStep,
        onAddStep: (scriptId: number) => {
          const nextOrder: number = script.steps.length + 1;
          void editor.createStep(scriptId, {
            title: `Step ${nextOrder}`,
            task: "Describe the task for this step",
            order: nextOrder,
          });
        },
      },
      draggable: true,
    }));
  }, [flow, selectedScriptId, selectedStepId, editor]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Handle drag end — save position
      for (const change of changes) {
        if (change.type === "position" && change.position && !change.dragging) {
          const nodeId: string = change.id;
          const scriptId: number = Number(nodeId.replace("script-", ""));
          void editor.updateScriptPosition(
            scriptId,
            change.position.x,
            change.position.y,
          );
        }
      }
      // Apply changes locally is handled by React Flow internally via nodes prop
      return applyNodeChanges(changes, nodes);
    },
    [editor, nodes],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      proOptions={{ hideAttribution: true }}
      className="bg-[var(--app-bg-page)]"
    >
      <Background variant={BackgroundVariant.Dots} gap={60} size={3} color="var(--app-border)" />
      <Controls
        position="bottom-left"
        className="!rounded-lg !border-[var(--app-border)] !bg-white !shadow-sm"
      />
      <MiniMap
        position="bottom-left"
        style={{ marginBottom: 60, marginLeft: 0 }}
        className="!rounded-lg !border-[var(--app-border)] !bg-white"
        nodeColor="var(--app-primary)"
        maskColor="rgba(0, 0, 0, 0.05)"
      />
    </ReactFlow>
  );
}
