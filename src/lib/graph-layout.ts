import { MarkerType, type Node, type Edge } from "@xyflow/react";
import type { Company, OwnershipRelation, ControllerHolding } from "@/types";

export interface CompanyNodeData {
  company: Company;
  label: string;
  depth: number;
  [key: string]: unknown;
}

// ─── 세로 리스트 레이아웃 상수 ───
const NODE_W = 200;
const INDENT = 230; // 부모-자식 가로 들여쓰기 (노드 너비 + 여백)
const ROW_H = 90; // 행 간격

export function buildGraphData(
  companies: Company[],
  relations: OwnershipRelation[],
  controllerHoldings: ControllerHolding[],
  controllerName?: string
): { nodes: Node<CompanyNodeData>[]; edges: Edge[] } {
  if (companies.length === 0) return { nodes: [], edges: [] };

  const companyMap = new Map(companies.map((c) => [c.id, c]));

  // ── 동일인 노드 ──
  let ctrl = companies.find((c) => c.isController);
  const all = [...companies];

  if (!ctrl && controllerHoldings.length > 0) {
    ctrl = {
      id: "__controller__",
      groupId: companies[0].groupId,
      name: controllerName ?? "동일인",
      isListed: false,
      isHolding: false,
      isController: true,
      category: "동일인",
    };
    all.unshift(ctrl);
    companyMap.set(ctrl.id, ctrl);
  }

  // ── 유효 관계 (0% 제외, 자기참조 제외) ──
  const rels = relations.filter(
    (r) =>
      companyMap.has(r.fromCompanyId) &&
      companyMap.has(r.toCompanyId) &&
      r.fromCompanyId !== r.toCompanyId &&
      r.ownershipPct > 0
  );
  const ctrlH = controllerHoldings.filter(
    (h) => companyMap.has(h.companyId) && h.ownershipPct > 0
  );

  // ── 소유자 맵 ──
  const incoming = new Map<string, { from: string; pct: number }[]>();
  for (const r of rels) {
    const arr = incoming.get(r.toCompanyId) ?? [];
    arr.push({ from: r.fromCompanyId, pct: r.ownershipPct });
    incoming.set(r.toCompanyId, arr);
  }
  if (ctrl) {
    for (const h of ctrlH) {
      const arr = incoming.get(h.companyId) ?? [];
      arr.push({ from: ctrl.id, pct: h.ownershipPct });
      incoming.set(h.companyId, arr);
    }
  }

  // ── 트리 구축 (BFS, 주요 부모 = 최대 지분율) ──
  const children = new Map<string, string[]>();
  const visited = new Set<string>();
  const queue: string[] = [];

  // 주요 부모 결정
  const bestParent = new Map<string, string>();
  for (const c of all) {
    if (c.id === ctrl?.id) continue;
    const inc = incoming.get(c.id);
    if (!inc || inc.length === 0) continue;
    const best = [...inc].sort((a, b) => b.pct - a.pct)[0];
    bestParent.set(c.id, best.from);
  }

  if (ctrl) {
    visited.add(ctrl.id);
    queue.push(ctrl.id);
    children.set(ctrl.id, []);
  }

  while (queue.length > 0) {
    const pid = queue.shift()!;
    const kids: string[] = [];
    for (const c of all) {
      if (visited.has(c.id)) continue;
      if (bestParent.get(c.id) === pid) kids.push(c.id);
    }
    // 지분율 내림차순 정렬
    kids.sort((a, b) => {
      const ap = (incoming.get(a) ?? []).find((e) => e.from === pid)?.pct ?? 0;
      const bp = (incoming.get(b) ?? []).find((e) => e.from === pid)?.pct ?? 0;
      return bp - ap;
    });
    for (const kid of kids) {
      visited.add(kid);
      children.set(kid, []);
      queue.push(kid);
    }
    children.set(pid, kids);
  }

  // 고아 노드
  for (const c of all) {
    if (visited.has(c.id)) continue;
    visited.add(c.id);
    children.set(c.id, []);
    const inc = incoming.get(c.id) ?? [];
    const vp = [...inc]
      .filter((e) => children.has(e.from))
      .sort((a, b) => b.pct - a.pct)[0];
    if (vp) children.get(vp.from)!.push(c.id);
    else if (ctrl) children.get(ctrl.id)!.push(c.id);
  }

  // ── 트리 엣지 셋 ──
  const treeEdges = new Set<string>();
  children.forEach((kids, pid) => {
    for (const kid of kids) treeEdges.add(`${pid}->${kid}`);
  });

  // ── 세로 리스트 배치 (DFS pre-order) ──
  // 모든 노드를 위→아래로 나열, depth로 X 오프셋
  const positions = new Map<string, { x: number; y: number }>();
  const depthMap = new Map<string, number>();
  let row = 0;

  function dfs(id: string, depth: number) {
    positions.set(id, { x: depth * INDENT, y: row * ROW_H });
    depthMap.set(id, depth);
    row++;
    for (const kid of children.get(id) ?? []) {
      dfs(kid, depth + 1);
    }
  }

  if (ctrl) {
    dfs(ctrl.id, 0);
  } else {
    for (const c of all) {
      if (!positions.has(c.id)) dfs(c.id, 0);
    }
  }

  // ── 노드 생성 ──
  const nodes: Node<CompanyNodeData>[] = [];
  for (const [id, pos] of positions) {
    const company = companyMap.get(id);
    if (!company) continue;
    nodes.push({
      id,
      type: "company",
      position: pos,
      data: {
        company,
        label: company.name,
        depth: depthMap.get(id) ?? 0,
      },
    });
  }

  // ── 엣지 생성 ──
  const edges: Edge[] = [];
  const idSet = new Set(all.map((c) => c.id));

  const mkMarker = (color: string) => ({
    type: MarkerType.ArrowClosed,
    color,
    width: 8,
    height: 8,
  });

  for (const r of rels) {
    if (!idSet.has(r.fromCompanyId) || !idSet.has(r.toCompanyId)) continue;
    const isTree = treeEdges.has(`${r.fromCompanyId}->${r.toCompanyId}`);
    const color = edgeColor(r.ownershipPct);
    edges.push({
      id: r.id,
      source: r.fromCompanyId,
      target: r.toCompanyId,
      type: "ownership",
      sourceHandle: isTree ? "bottom" : "right",
      targetHandle: isTree ? "top" : "left",
      data: {
        ownershipPct: r.ownershipPct,
        isControllerEdge: false,
        isTreeEdge: isTree,
      },
      markerEnd: mkMarker(color),
    });
  }

  if (ctrl) {
    for (let i = 0; i < ctrlH.length; i++) {
      const h = ctrlH[i];
      if (!idSet.has(h.companyId)) continue;
      const isTree = treeEdges.has(`${ctrl.id}->${h.companyId}`);
      edges.push({
        id: `ctrl-${i}`,
        source: ctrl.id,
        target: h.companyId,
        type: "ownership",
        sourceHandle: "bottom",
        targetHandle: "top",
        data: {
          ownershipPct: h.ownershipPct,
          isControllerEdge: true,
          isTreeEdge: isTree,
        },
        markerEnd: mkMarker("#F59E0B"),
      });
    }
  }

  return { nodes, edges };
}

function edgeColor(pct: number): string {
  if (pct >= 50) return "#F59E0B";
  if (pct >= 20) return "#3182F6";
  if (pct >= 5) return "#64748B";
  return "#4B5563";
}
