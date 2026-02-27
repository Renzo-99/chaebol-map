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
  targetX,
  targetY,
  data,
}: EdgeProps) {
  const pct = (data?.ownershipPct as number) ?? 0;
  const isController = (data?.isControllerEdge as boolean) ?? false;
  const dimmed = (data?.dimmed as boolean) ?? false;

  // 직각 엣지 (FTC 스타일)
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    borderRadius: 0,
  });

  // 라벨 위치: 엣지 중간
  const lx = sourceX + (targetX - sourceX) * 0.5;
  const ly = sourceY + (targetY - sourceY) * 0.5;

  const strokeColor = isController ? "#D97706" : "#555";
  const strokeWidth = isController ? 1.5 : 1;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          opacity: dimmed ? 0.08 : 1,
          transition: "opacity 0.2s",
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="ftc-pct"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${lx}px,${ly}px)`,
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
