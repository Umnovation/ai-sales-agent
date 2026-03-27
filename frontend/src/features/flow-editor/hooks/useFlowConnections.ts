import { useMemo } from "react";
import type { Edge } from "@xyflow/react";
import type { Flow } from "@/api/types/flow";

export function useFlowConnections(flow: Flow | null): Edge[] {
  return useMemo((): Edge[] => {
    if (!flow) return [];

    const edges: Edge[] = [];

    for (const script of flow.scripts) {
      for (const step of script.steps) {
        if (step.success_step_id !== null) {
          const targetScript = flow.scripts.find((s) =>
            s.steps.some((st) => st.id === step.success_step_id),
          );
          if (targetScript && targetScript.id !== script.id) {
            edges.push({
              id: `success-${step.id}-${step.success_step_id}`,
              source: `script-${script.id}`,
              sourceHandle: `step-${step.id}-source`,
              target: `script-${targetScript.id}`,
              targetHandle: `step-${step.success_step_id}-target`,
              type: "flowEdge",
              data: { connectionType: "success" },
              animated: false,
            });
          }
        }

        if (step.fail_step_id !== null) {
          const targetScript = flow.scripts.find((s) =>
            s.steps.some((st) => st.id === step.fail_step_id),
          );
          if (targetScript && targetScript.id !== script.id) {
            edges.push({
              id: `fail-${step.id}-${step.fail_step_id}`,
              source: `script-${script.id}`,
              sourceHandle: `step-${step.id}-source`,
              target: `script-${targetScript.id}`,
              targetHandle: `step-${step.fail_step_id}-target`,
              type: "flowEdge",
              data: { connectionType: "fail" },
              animated: false,
            });
          }
        }
      }
    }

    return edges;
  }, [flow]);
}
