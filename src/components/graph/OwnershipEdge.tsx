"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";

export function OwnershipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const pct = (data?.ownershipPct as number) ?? 0;
  const isController = (data?.isControllerEdge as boolean) ?? false;

  // 지분율에 따른 스타일
  let strokeColor: string;
  let strokeWidth: number;
  let dashArray: string | undefined;

  if (isController) {
    strokeColor = "#F59E0B";
    strokeWidth = 2.5;
  } else if (pct >= 50) {
    strokeColor = "#F59E0B";
    strokeWidth = 3;
  } else if (pct >= 20) {
    strokeColor = "#3B82F6";
    strokeWidth = 2;
  } else if (pct >= 5) {
    strokeColor = "#64748B";
    strokeWidth = 1.5;
  } else {
    strokeColor = "#475569";
    strokeWidth = 1;
    dashArray = "4,4";
  }

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  // 레이블 색상
  const labelColor = isController
    ? "#FCD34D"
    : pct >= 50
    ? "#F59E0B"
    : pct >= 20
    ? "#60A5FA"
    : "#94A3B8";

  const labelBg = isController
    ? "rgba(245, 158, 11, 0.12)"
    : pct >= 50
    ? "rgba(245, 158, 11, 0.1)"
    : pct >= 20
    ? "rgba(59, 130, 246, 0.1)"
    : "rgba(100, 116, 139, 0.08)";

  const labelBorder = isController
    ? "rgba(245, 158, 11, 0.3)"
    : pct >= 50
    ? "rgba(245, 158, 11, 0.2)"
    : pct >= 20
    ? "rgba(59, 130, 246, 0.2)"
    : "rgba(100, 116, 139, 0.15)";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: dashArray,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="edge-label"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
            color: labelColor,
            background: labelBg,
            borderColor: labelBorder,
          }}
        >
          {pct}%
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
