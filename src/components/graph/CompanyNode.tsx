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

  // 타입별 클래스
  const typeClass = isHolding
    ? "ftc-holding"
    : isListed
    ? "ftc-listed"
    : "ftc-unlisted";

  return (
    <div className={`ftc-node ${typeClass} ${selected ? "ftc-sel" : ""}`}>
      <Handle type="target" position={Position.Top} className="ftc-handle" />
      <div className="ftc-name-row">
        {isListed && <span className="ftc-star">★</span>}
        <span className="ftc-name">{company.name}</span>
      </div>
      {isListed && company.stockPrice != null && (
        <div className="ftc-price-row">
          <span className="ftc-price">
            {company.stockPrice.toLocaleString()}원
          </span>
          <span
            className={`ftc-change ${
              (company.priceChangePercent ?? 0) > 0
                ? "ftc-up"
                : (company.priceChangePercent ?? 0) < 0
                ? "ftc-down"
                : ""
            }`}
          >
            {(company.priceChangePercent ?? 0) > 0 ? "+" : ""}
            {(company.priceChangePercent ?? 0).toFixed(1)}%
          </span>
        </div>
      )}
      {isHolding && !isListed && (
        <div className="ftc-holding-badge">지주</div>
      )}
      <Handle type="source" position={Position.Bottom} className="ftc-handle" />
    </div>
  );
});
