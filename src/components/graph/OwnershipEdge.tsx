"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  type EdgeProps,
} from "@xyflow/react";

export const OwnershipEdge = memo(function OwnershipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  markerEnd,
}: EdgeProps) {
  const pct = (data?.ownershipPct as number) ?? 0;
  const isController = (data?.isControllerEdge as boolean) ?? false;
  const dimmed = (data?.dimmed as boolean) ?? false;
  const highlighted = (data?.highlighted as boolean) ?? false;

  // 지분율에 따른 스타일
  let strokeColor: string;
  let strokeWidth: number;
  let dashArray: string | undefined;

  if (isController) {
    strokeColor = "#F59E0B";
    strokeWidth = 2;
  } else if (pct >= 50) {
    strokeColor = "#F59E0B";
    strokeWidth = 2.5;
  } else if (pct >= 20) {
    strokeColor = "#3182F6";
    strokeWidth = 1.5;
  } else if (pct >= 5) {
    strokeColor = "#64748B";
    strokeWidth = 1;
  } else {
    strokeColor = "#4B5563";
    strokeWidth = 0.8;
    dashArray = "4,4";
  }

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  // 라벨을 타겟 노드 가까이 배치 (75% 지점)
  const lx = sourceX + (targetX - sourceX) * 0.75;
  const ly = sourceY + (targetY - sourceY) * 0.75;

  // 기본: 20%+ 또는 동일인만 표시, 호버 시: 전부 표시
  const showLabel = highlighted || pct >= 20 || isController;

  // 레이블 색상
  const labelColor = isController
    ? "#FCD34D"
    : pct >= 50
    ? "#F59E0B"
    : pct >= 20
    ? "#60A5FA"
    : "#94A3B8";

  const labelBg = isController
    ? "rgba(245, 158, 11, 0.15)"
    : pct >= 50
    ? "rgba(245, 158, 11, 0.12)"
    : pct >= 20
    ? "rgba(59, 130, 246, 0.12)"
    : "rgba(100, 116, 139, 0.1)";

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
          opacity: dimmed ? 0.06 : 1,
          transition: "opacity 0.2s",
        }}
      />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            className="ftc-edge-label"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${lx}px,${ly}px)`,
              pointerEvents: "none",
              color: labelColor,
              background: labelBg,
              borderColor: labelBorder,
              opacity: dimmed ? 0.06 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {pct === 100 ? "100" : pct.toFixed(1)}%
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
