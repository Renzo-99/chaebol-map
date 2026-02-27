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
  const isHolding = company.isHolding;
  const isListed = company.isListed;

  // 가격 변동
  const priceUp = (company.priceChange ?? 0) > 0;
  const priceDown = (company.priceChange ?? 0) < 0;

  // 노드 타입별 클래스
  const typeClass = isController
    ? "node-controller"
    : isHolding
    ? "node-holding"
    : isListed
    ? "node-listed"
    : "node-unlisted";

  return (
    <div
      className={`ownership-node ${typeClass} ${selected ? "node-selected" : ""}`}
    >
      <Handle type="target" position={Position.Top} className="node-handle" />

      {/* 동일인(총수) 노드 */}
      {isController ? (
        <div className="node-controller-inner">
          <div className="node-controller-icon">👤</div>
          <div className="node-controller-label">동일인</div>
          <div className="node-controller-name">{company.name}</div>
        </div>
      ) : (
        <>
          {/* 회사 헤더 */}
          <div className="node-header">
            <div className="node-name-row">
              {isListed && <span className="node-star">★</span>}
              <span className="node-name">{company.name}</span>
            </div>
            <span className="node-category">{company.category}</span>
          </div>

          {/* 상장사 주가 정보 */}
          {isListed && company.stockPrice != null && (
            <div className="node-stock">
              <span className="node-price">
                {company.stockPrice.toLocaleString()}원
              </span>
              <span
                className={`node-change ${
                  priceUp ? "change-up" : priceDown ? "change-down" : "change-flat"
                }`}
              >
                {priceUp ? "▲" : priceDown ? "▼" : "−"}
                {Math.abs(company.priceChangePercent ?? 0).toFixed(1)}%
              </span>
            </div>
          )}

          {/* 지주회사 뱃지 */}
          {isHolding && !isListed && (
            <div className="node-holding-badge">지주회사</div>
          )}
        </>
      )}

      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
});
