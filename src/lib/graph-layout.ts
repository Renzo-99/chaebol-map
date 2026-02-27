import { MarkerType, type Node, type Edge } from "@xyflow/react";
import type { Company, OwnershipRelation, ControllerHolding } from "@/types";

export interface CompanyNodeData {
  company: Company;
  label: string;
  [key: string]: unknown;
}

// 노드 크기 (FTC 배치 + 토스 디자인)
const NODE_H_LISTED = 50;
const NODE_H_UNLISTED = 30;
const NODE_H_CONTROLLER = 50;

export function buildGraphData(
  companies: Company[],
  relations: OwnershipRelation[],
  controllerHoldings: ControllerHolding[]
): { nodes: Node<CompanyNodeData>[]; edges: Edge[] } {
  if (companies.length === 0) return { nodes: [], edges: [] };

  const companyMap = new Map(companies.map((c) => [c.id, c]));

  // 소유 관계 그래프
  const childrenOf = new Map<string, { id: string; pct: number }[]>();
  const parentsOf = new Map<string, { id: string; pct: number }[]>();

  relations.forEach((r) => {
    if (!companyMap.has(r.fromCompanyId) || !companyMap.has(r.toCompanyId)) return;
    if (r.fromCompanyId === r.toCompanyId) return;

    const children = childrenOf.get(r.fromCompanyId) ?? [];
    children.push({ id: r.toCompanyId, pct: r.ownershipPct });
    childrenOf.set(r.fromCompanyId, children);

    const parents = parentsOf.get(r.toCompanyId) ?? [];
    parents.push({ id: r.fromCompanyId, pct: r.ownershipPct });
    parentsOf.set(r.toCompanyId, parents);
  });

  const controller = companies.find((c) => c.isController);

  // BFS 레벨 할당
  const level = new Map<string, number>();
  const visited = new Set<string>();
  const queue: string[] = [];

  if (controller) {
    level.set(controller.id, 0);
    visited.add(controller.id);

    const ctrlHoldSorted = [...controllerHoldings].sort(
      (a, b) => b.ownershipPct - a.ownershipPct
    );
    ctrlHoldSorted.forEach((h) => {
      if (companyMap.has(h.companyId) && !visited.has(h.companyId)) {
        level.set(h.companyId, 1);
        visited.add(h.companyId);
        queue.push(h.companyId);
      }
    });
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = level.get(current)!;
    const children = childrenOf.get(current) ?? [];
    children.sort((a, b) => b.pct - a.pct);
    children.forEach((child) => {
      if (!visited.has(child.id)) {
        level.set(child.id, currentLevel + 1);
        visited.add(child.id);
        queue.push(child.id);
      }
    });
  }

  companies.forEach((c) => {
    if (!visited.has(c.id)) {
      const parents = parentsOf.get(c.id);
      if (parents && parents.length > 0) {
        const bestParent = parents.sort((a, b) => b.pct - a.pct)[0];
        const parentLevel = level.get(bestParent.id);
        if (parentLevel !== undefined) {
          level.set(c.id, parentLevel + 1);
        } else {
          level.set(c.id, c.isHolding ? 1 : c.isListed ? 2 : 3);
        }
      } else {
        level.set(c.id, c.isHolding ? 1 : c.isListed ? 2 : 3);
      }
      visited.add(c.id);
    }
  });

  // 레벨별 분류
  const levelGroups = new Map<number, Company[]>();
  companies.forEach((c) => {
    const lv = level.get(c.id) ?? 3;
    const group = levelGroups.get(lv) ?? [];
    group.push(c);
    levelGroups.set(lv, group);
  });

  levelGroups.forEach((group) => {
    group.sort((a, b) => {
      if (a.isHolding && !b.isHolding) return -1;
      if (!a.isHolding && b.isHolding) return 1;
      if (a.isListed && !b.isListed) return -1;
      if (!a.isListed && b.isListed) return 1;
      if (a.isListed && b.isListed) return (b.marketCap ?? 0) - (a.marketCap ?? 0);
      return 0;
    });
  });

  // 적응형 스케일링
  const totalNodes = companies.length;
  const scale =
    totalNodes > 50 ? 0.65 : totalNodes > 35 ? 0.75 : totalNodes > 20 ? 0.85 : 1;

  const hGap = Math.round(175 * scale);
  const vGap = Math.round(110 * scale);

  // 노드 배치
  const nodes: Node<CompanyNodeData>[] = [];
  const sortedLevels = [...levelGroups.keys()].sort((a, b) => a - b);

  sortedLevels.forEach((lv) => {
    const group = levelGroups.get(lv)!;
    const perRow =
      lv === 0
        ? 1
        : Math.min(
            group.length,
            totalNodes > 50 ? 12 : totalNodes > 35 ? 10 : totalNodes > 20 ? 8 : 6
          );

    for (let i = 0; i < group.length; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const colsInRow = Math.min(perRow, group.length - row * perRow);
      const totalWidth = (colsInRow - 1) * hGap;
      const x = -totalWidth / 2 + col * hGap;

      const nodeH = group[i].isController
        ? NODE_H_CONTROLLER
        : group[i].isListed
        ? NODE_H_LISTED
        : NODE_H_UNLISTED;

      const baseY = lv * vGap * 1.2;
      const y = baseY + row * (nodeH + 30 * scale);

      nodes.push({
        id: group[i].id,
        type: "company",
        position: { x, y },
        data: { company: group[i], label: group[i].name },
      });
    }
  });

  // 엣지
  const edges: Edge[] = [];
  const nodeIdSet = new Set(companies.map((c) => c.id));

  const marker = {
    type: MarkerType.ArrowClosed,
    color: "#64748B",
    width: 10,
    height: 10,
  };

  relations.forEach((rel) => {
    if (!nodeIdSet.has(rel.fromCompanyId) || !nodeIdSet.has(rel.toCompanyId)) return;
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
        source: controller.id,
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
