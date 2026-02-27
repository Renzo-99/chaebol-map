import { MarkerType, type Node, type Edge } from "@xyflow/react";
import type { Company, OwnershipRelation, ControllerHolding } from "@/types";

export interface CompanyNodeData {
  company: Company;
  label: string;
  treeEdge?: boolean;
  [key: string]: unknown;
}

// 레이아웃 상수
const NODE_W = 200;
const H_GAP = 40;
const V_GAP = 120;

export function buildGraphData(
  companies: Company[],
  relations: OwnershipRelation[],
  controllerHoldings: ControllerHolding[],
  controllerName?: string
): { nodes: Node<CompanyNodeData>[]; edges: Edge[] } {
  if (companies.length === 0) return { nodes: [], edges: [] };

  const companyMap = new Map(companies.map((c) => [c.id, c]));

  // ─── 1. 동일인 노드 생성 ───
  let controller = companies.find((c) => c.isController);
  const allCompanies = [...companies];

  if (!controller && controllerHoldings.length > 0) {
    controller = {
      id: "__controller__",
      groupId: companies[0].groupId,
      name: controllerName ?? "동일인",
      isListed: false,
      isHolding: false,
      isController: true,
      category: "동일인",
    };
    allCompanies.unshift(controller);
    companyMap.set(controller.id, controller);
  }

  // ─── 2. 유효한 관계만 수집 (0% 제외) ───
  const validRelations = relations.filter(
    (r) =>
      companyMap.has(r.fromCompanyId) &&
      companyMap.has(r.toCompanyId) &&
      r.fromCompanyId !== r.toCompanyId &&
      r.ownershipPct > 0
  );

  const validCtrlHoldings = controllerHoldings.filter(
    (h) => companyMap.has(h.companyId) && h.ownershipPct > 0
  );

  // ─── 3. 각 회사의 소유자 수집 ───
  const incomingMap = new Map<string, { fromId: string; pct: number }[]>();

  validRelations.forEach((r) => {
    const incoming = incomingMap.get(r.toCompanyId) ?? [];
    incoming.push({ fromId: r.fromCompanyId, pct: r.ownershipPct });
    incomingMap.set(r.toCompanyId, incoming);
  });

  if (controller) {
    validCtrlHoldings.forEach((h) => {
      const incoming = incomingMap.get(h.companyId) ?? [];
      incoming.push({ fromId: controller!.id, pct: h.ownershipPct });
      incomingMap.set(h.companyId, incoming);
    });
  }

  // ─── 4. 주요 부모 결정 → 트리 구축 (BFS) ───
  const primaryParent = new Map<string, string>();
  allCompanies.forEach((c) => {
    if (c.id === controller?.id) return;
    const incoming = incomingMap.get(c.id);
    if (!incoming || incoming.length === 0) return;
    const best = [...incoming].sort((a, b) => b.pct - a.pct)[0];
    primaryParent.set(c.id, best.fromId);
  });

  const treeChildren = new Map<string, string[]>();
  const visited = new Set<string>();
  const queue: string[] = [];
  const nodeLevel = new Map<string, number>();

  if (controller) {
    visited.add(controller.id);
    queue.push(controller.id);
    treeChildren.set(controller.id, []);
    nodeLevel.set(controller.id, 0);
  }

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const level = nodeLevel.get(parentId) ?? 0;

    const children: string[] = [];
    allCompanies.forEach((c) => {
      if (visited.has(c.id)) return;
      if (primaryParent.get(c.id) === parentId) {
        children.push(c.id);
      }
    });

    children.sort((a, b) => {
      const aIncoming = incomingMap.get(a) ?? [];
      const bIncoming = incomingMap.get(b) ?? [];
      const aPct = aIncoming.find((e) => e.fromId === parentId)?.pct ?? 0;
      const bPct = bIncoming.find((e) => e.fromId === parentId)?.pct ?? 0;
      return bPct - aPct;
    });

    children.forEach((childId) => {
      visited.add(childId);
      treeChildren.set(childId, []);
      queue.push(childId);
      nodeLevel.set(childId, level + 1);
    });

    treeChildren.set(parentId, children);
  }

  // 고아 노드 처리
  allCompanies.forEach((c) => {
    if (visited.has(c.id)) return;
    visited.add(c.id);
    treeChildren.set(c.id, []);
    nodeLevel.set(c.id, 1);

    const incoming = incomingMap.get(c.id) ?? [];
    const validParent = [...incoming]
      .filter((e) => treeChildren.has(e.fromId))
      .sort((a, b) => b.pct - a.pct)[0];

    if (validParent) {
      treeChildren.get(validParent.fromId)!.push(c.id);
      nodeLevel.set(c.id, (nodeLevel.get(validParent.fromId) ?? 0) + 1);
    } else if (controller) {
      treeChildren.get(controller.id)!.push(c.id);
    }
  });

  // ─── 5. 적응형 스케일링 ───
  const totalNodes = allCompanies.length;
  const scale =
    totalNodes > 60 ? 0.6 : totalNodes > 40 ? 0.7 : totalNodes > 25 ? 0.85 : 1;

  const hGap = Math.max(20, Math.round(H_GAP * scale));
  const vGap = Math.round(V_GAP * scale);
  const cellW = NODE_W + hGap;

  // ─── 6. 서브트리 너비 계산 ───
  const leafCount = new Map<string, number>();

  function countLeaves(nodeId: string): number {
    if (leafCount.has(nodeId)) return leafCount.get(nodeId)!;
    const children = treeChildren.get(nodeId) ?? [];
    if (children.length === 0) {
      leafCount.set(nodeId, 1);
      return 1;
    }
    const total = children.reduce((sum, cid) => sum + countLeaves(cid), 0);
    leafCount.set(nodeId, total);
    return total;
  }

  // ─── 7. 위치 결정 ───
  const positions = new Map<string, { x: number; y: number }>();

  function positionTree(nodeId: string, leftX: number, level: number) {
    const children = treeChildren.get(nodeId) ?? [];

    let childLeft = leftX;
    children.forEach((childId) => {
      const childLeaves = countLeaves(childId);
      const childWidth = childLeaves * cellW;
      positionTree(childId, childLeft, level + 1);
      childLeft += childWidth;
    });

    if (children.length > 0) {
      const firstChild = positions.get(children[0])!;
      const lastChild = positions.get(children[children.length - 1])!;
      positions.set(nodeId, {
        x: (firstChild.x + lastChild.x) / 2,
        y: level * vGap,
      });
    } else {
      positions.set(nodeId, {
        x: leftX + cellW / 2 - NODE_W / 2,
        y: level * vGap,
      });
    }
  }

  if (controller) {
    const rootLeaves = countLeaves(controller.id);
    const totalWidth = rootLeaves * cellW;
    positionTree(controller.id, -totalWidth / 2, 0);
  } else {
    const cols = Math.max(1, Math.ceil(Math.sqrt(totalNodes)));
    allCompanies.forEach((c, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      positions.set(c.id, { x: col * cellW, y: row * vGap });
    });
  }

  // ─── 8. 트리 엣지 식별 ───
  const treeEdgeSet = new Set<string>();
  treeChildren.forEach((children, parentId) => {
    children.forEach((childId) => {
      treeEdgeSet.add(`${parentId}->${childId}`);
    });
  });

  // ─── 9. React Flow 노드 생성 ───
  const nodes: Node<CompanyNodeData>[] = [];
  positions.forEach((pos, id) => {
    const company = companyMap.get(id);
    if (!company) return;
    nodes.push({
      id,
      type: "company",
      position: { x: pos.x, y: pos.y },
      data: { company, label: company.name },
    });
  });

  // ─── 10. 엣지 생성 ───
  const edges: Edge[] = [];
  const nodeIdSet = new Set(allCompanies.map((c) => c.id));

  const makeMarker = (color: string) => ({
    type: MarkerType.ArrowClosed,
    color,
    width: 8,
    height: 8,
  });

  validRelations.forEach((rel) => {
    if (!nodeIdSet.has(rel.fromCompanyId) || !nodeIdSet.has(rel.toCompanyId))
      return;
    const isTree = treeEdgeSet.has(`${rel.fromCompanyId}->${rel.toCompanyId}`);
    const color = getEdgeColor(rel.ownershipPct, false);
    edges.push({
      id: rel.id,
      source: rel.fromCompanyId,
      target: rel.toCompanyId,
      type: "ownership",
      data: { ownershipPct: rel.ownershipPct, isControllerEdge: false, isTreeEdge: isTree },
      markerEnd: makeMarker(color),
    });
  });

  if (controller) {
    validCtrlHoldings.forEach((h, i) => {
      if (!nodeIdSet.has(h.companyId)) return;
      const isTree = treeEdgeSet.has(`${controller!.id}->${h.companyId}`);
      edges.push({
        id: `ctrl-${i}`,
        source: controller!.id,
        target: h.companyId,
        type: "ownership",
        data: { ownershipPct: h.ownershipPct, isControllerEdge: true, isTreeEdge: isTree },
        markerEnd: makeMarker("#F59E0B"),
      });
    });
  }

  return { nodes, edges };
}

function getEdgeColor(pct: number, isController: boolean): string {
  if (isController) return "#F59E0B";
  if (pct >= 50) return "#F59E0B";
  if (pct >= 20) return "#3182F6";
  if (pct >= 5) return "#64748B";
  return "#4B5563";
}
