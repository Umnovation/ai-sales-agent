import { useCallback, useEffect, useRef, useState } from "react";
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

const FIXED_Y = 40;
const SCRIPT_GAP_X = 300;

export function FlowCanvas({ editor }: FlowCanvasProps): React.ReactElement {
  const { flow, selectedScriptId, selectedStepId } = editor;
  const edges = useFlowConnections(flow);
  const [nodes, setNodes] = useState<Node[]>([]);
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Refs for stable callbacks inside node data
  const editorRef = useRef(editor);
  editorRef.current = editor;

  const flowRef = useRef(flow);
  flowRef.current = flow;

  // Build nodes from flow data — only when flow structure changes
  useEffect(() => {
    if (!flow) {
      setNodes([]);
      return;
    }

    const sorted = [...flow.scripts].sort((a, b) => a.id - b.id);

    const newNodes: Node[] = sorted.map((script, index) => {
      const nodeId = `script-${script.id}`;
      const localPos = positionsRef.current.get(nodeId);
      const x = localPos?.x ?? script.position_x ?? 40 + index * SCRIPT_GAP_X;
      const y = localPos?.y ?? script.position_y ?? FIXED_Y;

      return {
        id: nodeId,
        type: "scriptNode" as const,
        position: { x, y },
        data: {
          script,
          isSelected: selectedScriptId === script.id,
          selectedStepId,
          onSelectScript: (sid: number) => editorRef.current.selectScript(sid),
          onSelectStep: (stepId: number, sid: number) =>
            editorRef.current.selectStep(stepId, sid),
          onAddStep: (sid: number) => {
            const s = flowRef.current?.scripts.find((sc) => sc.id === sid);
            const nextOrder: number = (s?.steps.length ?? 0) + 1;
            void editorRef.current.createStep(sid, {
              title: `Step ${nextOrder}`,
              task: "Describe the task for this step",
              order: nextOrder,
            });
          },
        },
        draggable: true,
      };
    });

    setNodes(newNodes);
  }, [flow, selectedScriptId, selectedStepId]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((prev) => applyNodeChanges(changes, prev));

      // Track positions + save on drag end
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          positionsRef.current.set(change.id, {
            x: change.position.x,
            y: change.position.y,
          });

          if (!change.dragging) {
            const scriptId: number = Number(change.id.replace("script-", ""));
            void editorRef.current.updateScriptPosition(
              scriptId,
              change.position.x,
              change.position.y,
            );
          }
        }
      }
    },
    [],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      snapToGrid
      snapGrid={[20, 20]}
      minZoom={0.3}
      maxZoom={1}
      defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      proOptions={{ hideAttribution: true }}
      className="bg-[var(--app-bg-page)]"
    >
      <Background variant={BackgroundVariant.Dots} gap={60} size={3} color="var(--app-border)" />
      <Controls
        position="bottom-left"
        showInteractive={false}
        className="!rounded-lg !border-[var(--app-border)] !bg-white !shadow-sm"
      />
      <MiniMap
        position="bottom-right"
        className="!rounded-lg !border-[var(--app-border)] !bg-white"
        nodeColor="#C7D2FE"
        maskColor="rgba(0, 0, 0, 0.05)"
      />
    </ReactFlow>
  );
}
