import { MarkerType, type Node, type Edge } from "@xyflow/react";
import type { Company, OwnershipRelation, ControllerHolding } from "@/types";

export interface CompanyNodeData {
  company: Company;
  label: string;
  [key: string]: unknown;
}

// 레이아웃 상수 (실제 렌더링 크기 기준)
const BASE_NODE_W = 220;
const BASE_H_GAP = 50;
const BASE_V_GAP = 140;

export function buildGraphData(
  companies: Company[],
  relations: OwnershipRelation[],
  controllerHoldings: ControllerHolding[],
  controllerName?: string
): { nodes: Node<CompanyNodeData>[]; edges: Edge[] } {
  if (companies.length === 0) return { nodes: [], edges: [] };

  const companyMap = new Map(companies.map((c) => [c.id, c]));

  // 동일인 노드 확인 또는 가상 생성
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

  // 각 회사에 대한 소유 관계 수집 (누가 이 회사를 얼마나 소유하는지)
  const incomingOwnership = new Map<string, { fromId: string; pct: number }[]>();

  relations.forEach((r) => {
    if (!companyMap.has(r.fromCompanyId) || !companyMap.has(r.toCompanyId)) return;
    if (r.fromCompanyId === r.toCompanyId) return;
    const incoming = incomingOwnership.get(r.toCompanyId) ?? [];
    incoming.push({ fromId: r.fromCompanyId, pct: r.ownershipPct });
    incomingOwnership.set(r.toCompanyId, incoming);
  });

  if (controller) {
    controllerHoldings.forEach((h) => {
      if (!companyMap.has(h.companyId)) return;
      const incoming = incomingOwnership.get(h.companyId) ?? [];
      incoming.push({ fromId: controller!.id, pct: h.ownershipPct });
      incomingOwnership.set(h.companyId, incoming);
    });
  }

  // 각 회사의 주요 모회사 결정 (지분율 가장 높은 소유자)
  const primaryChildrenMap = new Map<string, string[]>();

  allCompanies.forEach((c) => {
    if (c.id === controller?.id) return;
    const incoming = incomingOwnership.get(c.id);
    if (!incoming || incoming.length === 0) return;
    const sorted = [...incoming].sort((a, b) => b.pct - a.pct);
    const bestParent = sorted[0];
    const children = primaryChildrenMap.get(bestParent.fromId) ?? [];
    children.push(c.id);
    primaryChildrenMap.set(bestParent.fromId, children);
  });

  // 자식을 지분율 내림차순 정렬
  primaryChildrenMap.forEach((children, parentId) => {
    children.sort((a, b) => {
      const aIncoming = incomingOwnership.get(a) ?? [];
      const bIncoming = incomingOwnership.get(b) ?? [];
      const aPct = aIncoming.find((e) => e.fromId === parentId)?.pct ?? 0;
      const bPct = bIncoming.find((e) => e.fromId === parentId)?.pct ?? 0;
      return bPct - aPct;
    });
  });

  // BFS로 트리 구축 (순환 방지)
  const treeChildren = new Map<string, string[]>();
  const visited = new Set<string>();
  const queue: string[] = [];

  if (controller) {
    visited.add(controller.id);
    queue.push(controller.id);
    treeChildren.set(controller.id, []);
  }

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const candidates = primaryChildrenMap.get(parentId) ?? [];
    const validChildren: string[] = [];
    candidates.forEach((childId) => {
      if (!visited.has(childId)) {
        visited.add(childId);
        validChildren.push(childId);
        treeChildren.set(childId, []);
        queue.push(childId);
      }
    });
    treeChildren.set(parentId, validChildren);
  }

  // 고아 노드 처리 (트리에 아직 없는 회사)
  allCompanies.forEach((c) => {
    if (visited.has(c.id)) return;
    visited.add(c.id);
    treeChildren.set(c.id, []);

    // 트리에 이미 있는 최적 부모 찾기
    const incoming = incomingOwnership.get(c.id) ?? [];
    const validParent = [...incoming]
      .filter((e) => treeChildren.has(e.fromId))
      .sort((a, b) => b.pct - a.pct)[0];

    if (validParent) {
      treeChildren.get(validParent.fromId)!.push(c.id);
    } else if (controller) {
      treeChildren.get(controller.id)!.push(c.id);
    }
  });

  // 적응형 스케일링
  const totalNodes = allCompanies.length;
  const scale =
    totalNodes > 50
      ? 0.78
      : totalNodes > 35
      ? 0.85
      : totalNodes > 20
      ? 0.92
      : 1;

  const nodeW = Math.round(BASE_NODE_W * scale);
  const hGap = Math.round(BASE_H_GAP * scale);
  const vGap = Math.round(BASE_V_GAP * scale);

  // 서브트리 너비 계산 (메모이제이션)
  const subtreeWidths = new Map<string, number>();

  function calcWidth(nodeId: string): number {
    if (subtreeWidths.has(nodeId)) return subtreeWidths.get(nodeId)!;
    const children = treeChildren.get(nodeId) ?? [];
    let width: number;
    if (children.length === 0) {
      width = nodeW;
    } else {
      const childrenTotal = children.reduce(
        (sum, cid) => sum + calcWidth(cid),
        0
      );
      width = childrenTotal + (children.length - 1) * hGap;
    }
    subtreeWidths.set(nodeId, width);
    return width;
  }

  // 노드 위치 결정 (트리 레이아웃)
  const positions = new Map<string, { x: number; y: number }>();

  function positionTree(nodeId: string, leftX: number, level: number) {
    const width = calcWidth(nodeId);
    positions.set(nodeId, {
      x: leftX + width / 2 - nodeW / 2,
      y: level * vGap,
    });

    const children = treeChildren.get(nodeId) ?? [];
    let childLeft = leftX;
    children.forEach((childId) => {
      const childWidth = calcWidth(childId);
      positionTree(childId, childLeft, level + 1);
      childLeft += childWidth + hGap;
    });
  }

  if (controller) {
    const rootWidth = calcWidth(controller.id);
    positionTree(controller.id, -rootWidth / 2, 0);
  } else {
    // 동일인 노드가 없는 경우 그리드 배치
    const cols = Math.max(1, Math.ceil(Math.sqrt(totalNodes)));
    allCompanies.forEach((c, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      positions.set(c.id, {
        x: col * (nodeW + hGap),
        y: row * vGap,
      });
    });
  }

  // React Flow 노드 생성
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

  // 엣지 생성
  const edges: Edge[] = [];
  const nodeIdSet = new Set(allCompanies.map((c) => c.id));

  const marker = {
    type: MarkerType.ArrowClosed,
    color: "#64748B",
    width: 10,
    height: 10,
  };

  relations.forEach((rel) => {
    if (!nodeIdSet.has(rel.fromCompanyId) || !nodeIdSet.has(rel.toCompanyId))
      return;
    if (rel.fromCompanyId === rel.toCompanyId) return;

    edges.push({
      id: rel.id,
      source: rel.fromCompanyId,
      target: rel.toCompanyId,
      type: "ownership",
      data: {
        ownershipPct: rel.ownershipPct,
        isControllerEdge: false,
      },
      markerEnd: marker,
    });
  });

  if (controller) {
    controllerHoldings.forEach((h, i) => {
      if (!nodeIdSet.has(h.companyId)) return;
      edges.push({
        id: `ctrl-${i}`,
        source: controller!.id,
        target: h.companyId,
        type: "ownership",
        data: {
          ownershipPct: h.ownershipPct,
          isControllerEdge: true,
        },
        markerEnd: marker,
      });
    });
  }

  return { nodes, edges };
}
