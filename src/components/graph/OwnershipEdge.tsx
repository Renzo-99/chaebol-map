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
  markerEnd,
  data,
}: EdgeProps) {
  const pct = (data?.ownershipPct as number) ?? 0;
  const isController = (data?.isControllerEdge as boolean) ?? false;
  const isTreeEdge = (data?.isTreeEdge as boolean) ?? true;
  const dimmed = (data?.dimmed as boolean) ?? false;

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (isTreeEdge) {
    // FTC 조직도 스타일: 직각 꺾임 경로
    // Parent(bottom) → 아래로 → 수평 → 아래로 → Child(top)
    const midY = sourceY + (targetY - sourceY) * 0.5;
    edgePath = `M ${sourceX},${sourceY} L ${sourceX},${midY} L ${targetX},${midY} L ${targetX},${targetY}`;

    // 라벨 위치: 수직 구간 중간
    if (Math.abs(sourceX - targetX) < 10) {
      // 거의 수직 — 오른쪽에 라벨
      labelX = sourceX + 12;
      labelY = (sourceY + targetY) * 0.5;
    } else {
      // 수평 구간 중간에 라벨
      labelX = (sourceX + targetX) * 0.5;
      labelY = midY - 8;
    }
  } else {
    // 비트리 엣지: 스무스 스텝 (교차출자 등)
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 6,
    });
  }

  // FTC 공정위 스타일 색상
  let strokeColor: string;
  let strokeWidth: number;
  let strokeDasharray: string | undefined;

  if (isController) {
    // 동일인 → 회사: 녹색 점선 (FTC 원본)
    strokeColor = "#16A34A";
    strokeWidth = 1.5;
    strokeDasharray = "6 3";
  } else if (!isTreeEdge) {
    // 교차출자/비트리: 회색 점선
    strokeColor = "#9CA3AF";
    strokeWidth = 0.8;
    strokeDasharray = "4 3";
  } else if (pct >= 50) {
    strokeColor = "#111";
    strokeWidth = 2;
  } else if (pct >= 20) {
    strokeColor = "#333";
    strokeWidth = 1.5;
  } else if (pct >= 5) {
    strokeColor = "#555";
    strokeWidth = 1.2;
  } else {
    strokeColor = "#888";
    strokeWidth = 1;
    strokeDasharray = "4 3";
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
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
            color: isController ? "#16A34A" : "#333",
          }}
        >
          {pct === 100 ? "100" : pct.toFixed(1)}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
