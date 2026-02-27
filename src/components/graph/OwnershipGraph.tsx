"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { GroupData, Company } from "@/types";
import { buildGraphData, type CompanyNodeData } from "@/lib/graph-layout";
import { CompanyNode } from "./CompanyNode";
import { OwnershipEdge } from "./OwnershipEdge";
import { CompanyDetailPanel } from "./CompanyDetailPanel";

const nodeTypes = { company: CompanyNode };
const edgeTypes = { ownership: OwnershipEdge };

interface OwnershipGraphProps {
  data: GroupData;
}

export function OwnershipGraph({ data }: OwnershipGraphProps) {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [minPct, setMinPct] = useState(0);

  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = buildGraphData(
      data.companies,
      data.relations,
      data.controllerHoldings
    );
    return { initialNodes: nodes, initialEdges: edges };
  }, [data]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const filteredEdges = useMemo(() => {
    if (minPct === 0) return edges;
    return edges.filter((e) => {
      const pct = (e.data?.ownershipPct as number) ?? 0;
      return pct >= minPct;
    });
  }, [edges, minPct]);

  const visibleNodeIds = useMemo(() => {
    if (minPct === 0) return null;
    const ids = new Set<string>();
    filteredEdges.forEach((e) => {
      ids.add(e.source);
      ids.add(e.target);
    });
    return ids;
  }, [filteredEdges, minPct]);

  const filteredNodes = useMemo(() => {
    if (!visibleNodeIds) return nodes;
    return nodes.filter((n) => visibleNodeIds.has(n.id));
  }, [nodes, visibleNodeIds]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<CompanyNodeData>) => {
      setSelectedCompany(node.data.company);
    },
    []
  );

  return (
    <div className="relative h-full w-full">
      {/* 필터 바 */}
      <div className="graph-filter-bar">
        <span className="graph-filter-label">지분율</span>
        <input
          type="range"
          min={0}
          max={50}
          value={minPct}
          onChange={(e) => setMinPct(Number(e.target.value))}
          className="graph-filter-slider"
        />
        <span className="graph-filter-value">{minPct}%+</span>
      </div>

      {/* 범례 */}
      <div className="graph-legend">
        <div className="graph-legend-title">범례</div>
        <div className="graph-legend-item">
          <div className="legend-dot legend-controller" />
          <span>동일인(총수)</span>
        </div>
        <div className="graph-legend-item">
          <div className="legend-dot legend-listed" />
          <span>상장회사 ★</span>
        </div>
        <div className="graph-legend-item">
          <div className="legend-dot legend-holding" />
          <span>지주회사</span>
        </div>
        <div className="graph-legend-item">
          <div className="legend-dot legend-unlisted" />
          <span>비상장</span>
        </div>
        <div className="graph-legend-divider" />
        <div className="graph-legend-item">
          <div className="legend-line legend-line-major" />
          <span>50%+ 지분</span>
        </div>
        <div className="graph-legend-item">
          <div className="legend-line legend-line-mid" />
          <span>20%+ 지분</span>
        </div>
        <div className="graph-legend-item">
          <div className="legend-line legend-line-minor" />
          <span>&lt;5% 지분</span>
        </div>
      </div>

      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.05}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "ownership" }}
      >
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            const company = (node.data as CompanyNodeData)?.company;
            if (!company) return "#475569";
            if (company.isController) return "#F59E0B";
            if (company.isHolding) return "#22C55E";
            if (company.isListed) return "#3182F6";
            return "#475569";
          }}
          maskColor="rgba(25, 31, 40, 0.7)"
          style={{ background: "#212830" }}
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#2C3542"
        />
      </ReactFlow>

      {/* 회사 상세 패널 */}
      {selectedCompany && (
        <CompanyDetailPanel
          company={selectedCompany}
          relations={data.relations}
          companies={data.companies}
          controllerHoldings={data.controllerHoldings}
          controllerName={data.group.controllerName}
          onClose={() => setSelectedCompany(null)}
        />
      )}
    </div>
  );
}
