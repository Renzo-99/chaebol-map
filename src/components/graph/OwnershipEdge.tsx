"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";

export const OwnershipEdge = memo(function OwnershipEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
}: EdgeProps) {
  const pct = (data?.ownershipPct as number) ?? 0;
  const isController = (data?.isControllerEdge as boolean) ?? false;
  const isTreeEdge = (data?.isTreeEdge as boolean) ?? true;
  const dimmed = (data?.dimmed as boolean) ?? false;

  // 직각 엣지 (FTC 스타일), 비트리 엣지는 약간 둥글게
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: isTreeEdge ? 0 : 8,
  });

  // 소유율 기반 스타일
  let strokeColor: string;
  let strokeWidth: number;
  let strokeDasharray: string | undefined;

  if (isController) {
    strokeColor = "#D97706";
    strokeWidth = 1.8;
  } else if (pct >= 50) {
    strokeColor = "#333";
    strokeWidth = 1.8;
  } else if (pct >= 20) {
    strokeColor = "#555";
    strokeWidth = 1.2;
  } else if (pct >= 5) {
    strokeColor = "#777";
    strokeWidth = 1;
  } else {
    strokeColor = "#aaa";
    strokeWidth = 0.8;
    strokeDasharray = "4 3";
  }

  // 비트리 엣지는 점선 + 더 연하게 (교차출자/순환출자 등)
  if (!isTreeEdge && !isController) {
    strokeColor = "#999";
    strokeDasharray = strokeDasharray ?? "6 3";
    strokeWidth = Math.min(strokeWidth, 1);
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray,
          opacity: dimmed ? 0.08 : 1,
          transition: "opacity 0.2s",
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="ftc-pct"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "none",
            opacity: dimmed ? 0.08 : 1,
          }}
        >
          {pct === 100 ? "100" : pct.toFixed(1)}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
