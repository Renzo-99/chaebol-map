"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CompanyNodeData } from "@/lib/graph-layout";

export const CompanyNode = memo(function CompanyNode({
  data,
  selected,
}: NodeProps) {
  const nodeData = data as CompanyNodeData & { dimmed?: boolean };
  const { company } = nodeData;
  const dimmed = nodeData.dimmed ?? false;
  const isController = company.isController;
  const isListed = company.isListed;
  const isHolding = company.isHolding;

  const dimStyle = dimmed
    ? { opacity: 0.15, transition: "opacity 0.2s" }
    : { transition: "opacity 0.2s" };

  if (isController) {
    return (
      <div
        className={`ftc-node ftc-ctrl ${selected ? "ftc-sel" : ""}`}
        style={dimStyle}
      >
        <Handle id="top" type="target" position={Position.Top} className="ftc-handle" />
        <Handle id="left" type="target" position={Position.Left} className="ftc-handle" />
        <span className="ftc-ctrl-sub">동일인</span>
        <span className="ftc-ctrl-name">{company.name}</span>
        <Handle id="bottom" type="source" position={Position.Bottom} className="ftc-handle" />
        <Handle id="right" type="source" position={Position.Right} className="ftc-handle" />
      </div>
    );
  }

  const typeClass = isHolding
    ? "ftc-holding"
    : isListed
    ? "ftc-listed"
    : "ftc-unlisted";

  const badge = isListed ? "상장" : "비상장";
  const badgeClass = isListed ? "ftc-badge-listed" : "ftc-badge-unlisted";

  return (
    <div
      className={`ftc-node ${typeClass} ${selected ? "ftc-sel" : ""}`}
      style={dimStyle}
    >
      <Handle id="top" type="target" position={Position.Top} className="ftc-handle" />
      <Handle id="left" type="target" position={Position.Left} className="ftc-handle" />
      <div className="ftc-node-header">
        <span className={`ftc-badge ${badgeClass}`}>{badge}</span>
        {isHolding && <span className="ftc-badge ftc-badge-holding">지주</span>}
      </div>
      <div className="ftc-name-row">
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
      <Handle id="bottom" type="source" position={Position.Bottom} className="ftc-handle" />
      <Handle id="right" type="source" position={Position.Right} className="ftc-handle" />
    </div>
  );
});
