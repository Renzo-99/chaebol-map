"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CompanyNodeData } from "@/lib/graph-layout";

export const CompanyNode = memo(function CompanyNode({
  data,
  selected,
}: NodeProps) {
  const { company } = data as CompanyNodeData;
  const isController = company.isController;
  const isListed = company.isListed;
  const isHolding = company.isHolding;

  // 동일인(총수) 노드
  if (isController) {
    return (
      <div className={`ftc-node ftc-ctrl ${selected ? "ftc-sel" : ""}`}>
        <Handle type="target" position={Position.Top} className="ftc-handle" />
        <span className="ftc-ctrl-sub">동일인</span>
        <span className="ftc-ctrl-name">({company.name})</span>
        <Handle type="source" position={Position.Bottom} className="ftc-handle" />
      </div>
    );
  }

  // 일반 회사 노드
  return (
    <div
      className={`ftc-node ${isHolding ? "ftc-holding" : ""} ${selected ? "ftc-sel" : ""}`}
    >
      <Handle type="target" position={Position.Top} className="ftc-handle" />
      <span className="ftc-label">
        {isListed && <span className="ftc-star">★</span>}
        {company.name}
      </span>
      <Handle type="source" position={Position.Bottom} className="ftc-handle" />
    </div>
  );
});
