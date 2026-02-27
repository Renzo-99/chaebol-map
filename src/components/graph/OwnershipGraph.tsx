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

type NodeFilter = "all" | "listed" | "holding" | "unlisted";

interface OwnershipGraphProps {
  data: GroupData;
}

export function OwnershipGraph({ data }: OwnershipGraphProps) {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [minPct, setMinPct] = useState(0);
  const [nodeFilter, setNodeFilter] = useState<NodeFilter>("all");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = buildGraphData(
      data.companies,
      data.relations,
      data.controllerHoldings,
      data.group.controllerName
    );
    return { initialNodes: nodes, initialEdges: edges };
  }, [data]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // 호버된 노드와 연결된 노드/엣지 ID
  const hoverConnected = useMemo(() => {
    if (!hoveredNodeId) return null;
    const connectedNodeIds = new Set<string>([hoveredNodeId]);
    const connectedEdgeIds = new Set<string>();
    edges.forEach((e) => {
      if (e.source === hoveredNodeId || e.target === hoveredNodeId) {
        connectedEdgeIds.add(e.id);
        connectedNodeIds.add(e.source);
        connectedNodeIds.add(e.target);
      }
    });
    return { nodeIds: connectedNodeIds, edgeIds: connectedEdgeIds };
  }, [hoveredNodeId, edges]);

  // 지분율 필터
  const pctFilteredEdges = useMemo(() => {
    if (minPct === 0) return edges;
    return edges.filter((e) => {
      const pct = (e.data?.ownershipPct as number) ?? 0;
      return pct >= minPct;
    });
  }, [edges, minPct]);

  // 노드 필터링
  const filteredNodes = useMemo(() => {
    let result = nodes;

    if (minPct > 0) {
      const pctNodeIds = new Set<string>();
      pctFilteredEdges.forEach((e) => {
        pctNodeIds.add(e.source);
        pctNodeIds.add(e.target);
      });
      result = result.filter((n) => pctNodeIds.has(n.id));
    }

    if (nodeFilter !== "all") {
      result = result.filter((n) => {
        const company = (n.data as CompanyNodeData).company;
        if (company.isController) return true;
        switch (nodeFilter) {
          case "listed":
            return company.isListed;
          case "holding":
            return company.isHolding;
          case "unlisted":
            return !company.isListed && !company.isHolding;
          default:
            return true;
        }
      });
    }

    if (hoverConnected) {
      result = result.map((n) => ({
        ...n,
        data: { ...n.data, dimmed: !hoverConnected.nodeIds.has(n.id) },
      }));
    }

    return result;
  }, [nodes, minPct, pctFilteredEdges, nodeFilter, hoverConnected]);

  // 엣지 필터링
  const finalEdges = useMemo(() => {
    const nodeIdSet = new Set(filteredNodes.map((n) => n.id));
    let result = pctFilteredEdges.filter(
      (e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
    );

    if (hoverConnected) {
      result = result.map((e) => {
        const isConnected = hoverConnected.edgeIds.has(e.id);
        return {
          ...e,
          data: { ...e.data, dimmed: !isConnected, highlighted: isConnected },
        };
      });
    }

    return result;
  }, [pctFilteredEdges, filteredNodes, hoverConnected]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<CompanyNodeData>) => {
      setSelectedCompany(node.data.company);
    },
    []
  );

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredNodeId(node.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedCompany(null);
  }, []);

  const filterButtons: { key: NodeFilter; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "listed", label: "상장사" },
    { key: "holding", label: "지주사" },
    { key: "unlisted", label: "비상장" },
  ];

  return (
    <div className="relative h-full w-full">
      {/* 필터 바 */}
      <div className="ftc-filter-bar">
        <div className="flex items-center gap-1 mr-2">
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setNodeFilter(btn.key)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                nodeFilter === btn.key
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-border/50 mx-1" />
        <span className="ftc-filter-label">지분율</span>
        <input
          type="range"
          min={0}
          max={50}
          value={minPct}
          onChange={(e) => setMinPct(Number(e.target.value))}
          className="ftc-filter-slider"
        />
        <span className="ftc-filter-value">{minPct}%+</span>
      </div>

      {/* 범례 */}
      <div className="ftc-legend">
        <div className="ftc-legend-title">범례</div>
        <div className="ftc-legend-item">
          <div className="ftc-legend-dot" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", border: "1px solid #FCD34D" }} />
          <span>동일인(총수)</span>
        </div>
        <div className="ftc-legend-item">
          <div className="ftc-legend-dot" style={{ background: "#212830", borderLeft: "3px solid #3182F6", borderRadius: "2px" }} />
          <span>상장회사</span>
        </div>
        <div className="ftc-legend-item">
          <div className="ftc-legend-dot" style={{ background: "#1C2E24", borderLeft: "3px solid #22C55E", borderRadius: "2px" }} />
          <span>지주회사</span>
        </div>
        <div className="ftc-legend-item">
          <div className="ftc-legend-dot" style={{ background: "#212830", border: "1px solid #2C3542" }} />
          <span>비상장</span>
        </div>
        <div className="ftc-legend-divider" />
        <div className="ftc-legend-item">
          <div className="ftc-legend-line" style={{ borderTop: "2.5px solid #F59E0B" }} />
          <span>50%+ 지분</span>
        </div>
        <div className="ftc-legend-item">
          <div className="ftc-legend-line" style={{ borderTop: "1.5px solid #3182F6" }} />
          <span>20%+ 지분</span>
        </div>
        <div className="ftc-legend-item">
          <div className="ftc-legend-line" style={{ borderTop: "1px solid #64748B" }} />
          <span>5%+ 지분</span>
        </div>
        <div className="ftc-legend-item">
          <div className="ftc-legend-line" style={{ borderTop: "1px dashed #4B5563" }} />
          <span>&lt;5% 지분</span>
        </div>
      </div>

      <ReactFlow
        nodes={filteredNodes}
        edges={finalEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.02}
        maxZoom={3}
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
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#2C3542" />
      </ReactFlow>

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
