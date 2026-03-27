import { memo } from "react";
import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

function FlowEdgeComponent(props: EdgeProps): React.ReactElement {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;

  const connectionType: string = (data as Record<string, unknown>)?.connectionType as string ?? "success";
  const isSuccess: boolean = connectionType === "success";

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.4,
  });

  return (
    <BaseEdge
      {...props}
      path={edgePath}
      style={{
        stroke: isSuccess ? "var(--app-success)" : "var(--app-error)",
        strokeWidth: 2,
        strokeDasharray: isSuccess ? undefined : "6 4",
      }}
    />
  );
}

export const FlowEdge = memo(FlowEdgeComponent);
