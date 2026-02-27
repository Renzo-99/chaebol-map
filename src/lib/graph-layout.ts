import type { Node, Edge } from "@xyflow/react";
import type { Company, OwnershipRelation, ControllerHolding } from "@/types";

export interface CompanyNodeData {
  company: Company;
  label: string;
  [key: string]: unknown;
}

// 노드 크기 상수
const NODE_W = 200;
const NODE_H_LISTED = 88;
const NODE_H_UNLISTED = 56;
const NODE_H_CONTROLLER = 96;

export function buildGraphData(
  companies: Company[],
  relations: OwnershipRelation[],
  controllerHoldings: ControllerHolding[]
): { nodes: Node<CompanyNodeData>[]; edges: Edge[] } {
  if (companies.length === 0) return { nodes: [], edges: [] };

  const companyMap = new Map(companies.map((c) => [c.id, c]));

  // 소유 관계 그래프 구성 (부모 → 자식 매핑)
  const childrenOf = new Map<string, { id: string; pct: number }[]>();
  const parentsOf = new Map<string, { id: string; pct: number }[]>();

  relations.forEach((r) => {
    if (!companyMap.has(r.fromCompanyId) || !companyMap.has(r.toCompanyId)) return;
    // 자기 자신 참조 무시
    if (r.fromCompanyId === r.toCompanyId) return;

    const children = childrenOf.get(r.fromCompanyId) ?? [];
    children.push({ id: r.toCompanyId, pct: r.ownershipPct });
    childrenOf.set(r.fromCompanyId, children);

    const parents = parentsOf.get(r.toCompanyId) ?? [];
    parents.push({ id: r.fromCompanyId, pct: r.ownershipPct });
    parentsOf.set(r.toCompanyId, parents);
  });

  // 총수(동일인) 찾기
  const controller = companies.find((c) => c.isController);

  // 총수 직접 소유 대상 (controllerHoldings)
  const ctrlTargets = new Set(controllerHoldings.map((h) => h.companyId));

  // ── BFS로 트리 레벨 할당 ──
  // 레벨 0: 총수
  // 레벨 1: 총수 직접 소유 기업 (지주회사 포함)
  // 레벨 2+: 하위 계열사
  const level = new Map<string, number>();
  const visited = new Set<string>();
  const queue: string[] = [];

  if (controller) {
    level.set(controller.id, 0);
    visited.add(controller.id);

    // 총수 직접 소유 기업 → 레벨 1
    // 지분율 높은 순 정렬
    const ctrlHoldSorted = [...controllerHoldings].sort((a, b) => b.ownershipPct - a.ownershipPct);
    ctrlHoldSorted.forEach((h) => {
      if (companyMap.has(h.companyId) && !visited.has(h.companyId)) {
        level.set(h.companyId, 1);
        visited.add(h.companyId);
        queue.push(h.companyId);
      }
    });
  }

  // BFS 순회 — 주요 소유 관계 따라 레벨 할당
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = level.get(current)!;
    const children = childrenOf.get(current) ?? [];

    // 지분율 높은 순 정렬 (주요 자회사 우선)
    children.sort((a, b) => b.pct - a.pct);

    children.forEach((child) => {
      if (!visited.has(child.id)) {
        level.set(child.id, currentLevel + 1);
        visited.add(child.id);
        queue.push(child.id);
      }
    });
  }

  // 미방문 노드 → 연결되지 않은 회사들
  companies.forEach((c) => {
    if (!visited.has(c.id)) {
      // 부모가 있으면 부모 레벨 + 1
      const parents = parentsOf.get(c.id);
      if (parents && parents.length > 0) {
        const bestParent = parents.sort((a, b) => b.pct - a.pct)[0];
        const parentLevel = level.get(bestParent.id);
        if (parentLevel !== undefined) {
          level.set(c.id, parentLevel + 1);
        } else {
          // 지주회사이면 1, 상장사이면 2, 비상장이면 3
          level.set(c.id, c.isHolding ? 1 : c.isListed ? 2 : 3);
        }
      } else {
        level.set(c.id, c.isHolding ? 1 : c.isListed ? 2 : 3);
      }
      visited.add(c.id);
    }
  });

  // ── 레벨별 노드 분류 ──
  const levelGroups = new Map<number, Company[]>();
  companies.forEach((c) => {
    const lv = level.get(c.id) ?? 3;
    const group = levelGroups.get(lv) ?? [];
    group.push(c);
    levelGroups.set(lv, group);
  });

  // 레벨 내 정렬: 지주회사 > 상장사(시총 순) > 비상장
  levelGroups.forEach((group) => {
    group.sort((a, b) => {
      // 지주회사 우선
      if (a.isHolding && !b.isHolding) return -1;
      if (!a.isHolding && b.isHolding) return 1;
      // 상장사 우선
      if (a.isListed && !b.isListed) return -1;
      if (!a.isListed && b.isListed) return 1;
      // 상장사끼리는 시총 순
      if (a.isListed && b.isListed) return (b.marketCap ?? 0) - (a.marketCap ?? 0);
      return 0;
    });
  });

  // ── 적응형 스케일링 ──
  const totalNodes = companies.length;
  const scale = totalNodes > 50 ? 0.72 : totalNodes > 35 ? 0.82 : totalNodes > 20 ? 0.9 : 1;

  const hGap = Math.round(240 * scale);
  const vGap = Math.round(180 * scale);

  // ── 노드 배치 ──
  const nodes: Node<CompanyNodeData>[] = [];
  const sortedLevels = [...levelGroups.keys()].sort((a, b) => a - b);

  sortedLevels.forEach((lv) => {
    const group = levelGroups.get(lv)!;
    const perRow = lv === 0 ? 1 : Math.min(group.length, totalNodes > 35 ? 8 : totalNodes > 20 ? 7 : 6);
    const rows = Math.ceil(group.length / perRow);

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

      // Y 위치: 레벨 기반 + 행 오프셋
      const baseY = lv * vGap * 1.2;
      const y = baseY + row * (nodeH + 40 * scale);

      nodes.push({
        id: group[i].id,
        type: "company",
        position: { x, y },
        data: { company: group[i], label: group[i].name },
      });
    }
  });

  // ── 엣지 생성 ──
  const edges: Edge[] = [];
  const nodeIdSet = new Set(companies.map((c) => c.id));

  relations.forEach((rel) => {
    if (!nodeIdSet.has(rel.fromCompanyId) || !nodeIdSet.has(rel.toCompanyId)) return;
    if (rel.fromCompanyId === rel.toCompanyId) return;

    edges.push({
      id: rel.id,
      source: rel.fromCompanyId,
      target: rel.toCompanyId,
      type: "ownership",
      animated: rel.ownershipPct >= 50,
      data: {
        ownershipPct: rel.ownershipPct,
        isControllerEdge: false,
      },
    });
  });

  // ── 동일인 지분 엣지 ──
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
      });
    });
  }

  return { nodes, edges };
}
