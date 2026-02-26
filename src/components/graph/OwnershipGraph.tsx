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
import { CompanyDetailPanel } from "./CompanyDetailPanel";

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
      const label = e.label as string;
      const pct = parseFloat(label);
      return !isNaN(pct) && pct >= minPct;
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
      {/* Filter bar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 px-4 py-2.5">
        <span className="text-xs text-muted-foreground font-medium">
          지분율 필터
        </span>
        <input
          type="range"
          min={0}
          max={50}
          value={minPct}
          onChange={(e) => setMinPct(Number(e.target.value))}
          className="w-28 accent-primary"
        />
        <span className="text-xs font-bold text-primary min-w-[36px]">
          {minPct}%+
        </span>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 px-4 py-3">
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
          범례
        </span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span className="text-[11px] text-muted-foreground">동일인(총수)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-blue-500 bg-blue-500/15" />
          <span className="text-[11px] text-muted-foreground">상장회사 ★</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-green-500 bg-green-500/15" />
          <span className="text-[11px] text-muted-foreground">지주회사</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border border-gray-500 bg-gray-500/15" />
          <span className="text-[11px] text-muted-foreground">비상장</span>
        </div>
      </div>

      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            const company = (node.data as CompanyNodeData)?.company;
            if (!company) return "#475569";
            if (company.isController) return "#F59E0B";
            if (company.isListed) return "#3182F6";
            if (company.isHolding) return "#22C55E";
            return "#475569";
          }}
          maskColor="rgba(25, 31, 40, 0.7)"
          style={{ background: "#212830" }}
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#2C3542"
        />
      </ReactFlow>

      {/* Company detail panel */}
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
