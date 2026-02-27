import { type Node, type Edge } from "@xyflow/react";
import type { Company, OwnershipRelation, ControllerHolding } from "@/types";

export interface CompanyNodeData {
  company: Company;
  label: string;
  depth: number;
  [key: string]: unknown;
}

// ── FTC 소유지분도 레이아웃 상수 ──
const NODE_W = 130;
const NODE_H = 38;
const H_GAP = 14;
const V_GAP = 52;

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
    if (ctrl) children.get(ctrl.id)!.push(c.id);
  }

  // ── 트리 엣지 셋 ──
  const treeEdges = new Set<string>();
  children.forEach((kids, pid) => {
    for (const kid of kids) treeEdges.add(`${pid}->${kid}`);
  });

  // ── 서브트리 너비 계산 ──
  const subtreeW = new Map<string, number>();

  function calcWidth(id: string): number {
    const kids = children.get(id) ?? [];
    if (kids.length === 0) {
      subtreeW.set(id, NODE_W);
      return NODE_W;
    }
    let total = 0;
    for (const kid of kids) total += calcWidth(kid);
    total += (kids.length - 1) * H_GAP;
    const w = Math.max(NODE_W, total);
    subtreeW.set(id, w);
    return w;
  }

  // ── 위치 배치 (부모 중앙, 자식 수평 분산) ──
  const positions = new Map<string, { x: number; y: number }>();
  const depthMap = new Map<string, number>();

  function layout(id: string, cx: number, y: number, depth: number) {
    positions.set(id, { x: cx - NODE_W / 2, y });
    depthMap.set(id, depth);

    const kids = children.get(id) ?? [];
    if (kids.length === 0) return;

    const myW = subtreeW.get(id) ?? NODE_W;
    let sx = cx - myW / 2;

    for (const kid of kids) {
      const kw = subtreeW.get(kid) ?? NODE_W;
      layout(kid, sx + kw / 2, y + NODE_H + V_GAP, depth + 1);
      sx += kw + H_GAP;
    }
  }

  if (ctrl) {
    calcWidth(ctrl.id);
    layout(ctrl.id, 0, 0, 0);
  } else {
    let ox = 0;
    for (const c of all) {
      if (!positions.has(c.id)) {
        calcWidth(c.id);
        const w = subtreeW.get(c.id) ?? NODE_W;
        layout(c.id, ox + w / 2, 0, 0);
        ox += w + H_GAP * 2;
      }
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
      data: { company, label: company.name, depth: depthMap.get(id) ?? 0 },
    });
  }

  // ── 엣지 생성 ──
  const edges: Edge[] = [];
  const idSet = new Set(all.map((c) => c.id));

  for (const r of rels) {
    if (!idSet.has(r.fromCompanyId) || !idSet.has(r.toCompanyId)) continue;
    const isTree = treeEdges.has(`${r.fromCompanyId}->${r.toCompanyId}`);
    edges.push({
      id: r.id,
      source: r.fromCompanyId,
      target: r.toCompanyId,
      type: "ownership",
      sourceHandle: isTree ? "bottom" : "right",
      targetHandle: isTree ? "top" : "left",
      data: { ownershipPct: r.ownershipPct, isControllerEdge: false, isTreeEdge: isTree },
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
        data: { ownershipPct: h.ownershipPct, isControllerEdge: true, isTreeEdge: isTree },
      });
    }
  }

  return { nodes, edges };
}
