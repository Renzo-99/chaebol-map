import type { Node, Edge } from "@xyflow/react";
import type { Company, OwnershipRelation, ControllerHolding } from "@/types";

export interface CompanyNodeData {
  company: Company;
  label: string;
  [key: string]: unknown;
}

// 노드 크기 상수 (CSS와 동기화)
const NODE_W = 180;
const NODE_H_LISTED = 82;
const NODE_H_UNLISTED = 52;
const NODE_H_CONTROLLER = 90;

export function buildGraphData(
  companies: Company[],
  relations: OwnershipRelation[],
  controllerHoldings: ControllerHolding[]
): { nodes: Node<CompanyNodeData>[]; edges: Edge[] } {
  const companyMap = new Map(companies.map((c) => [c.id, c]));

  // 카테고리별 분류
  const controller = companies.find((c) => c.isController);
  const holding = companies.filter((c) => c.isHolding && !c.isController);
  const listed = companies.filter(
    (c) => c.isListed && !c.isController && !c.isHolding
  );
  const unlisted = companies.filter(
    (c) => !c.isListed && !c.isController && !c.isHolding
  );

  // 적응형 스케일링
  const totalNodes = companies.length;
  const scale = totalNodes > 50 ? 0.75 : totalNodes > 35 ? 0.85 : totalNodes > 20 ? 0.92 : 1;

  const hGap = Math.round(220 * scale);
  const vGap = Math.round(160 * scale);

  const nodes: Node<CompanyNodeData>[] = [];
  let yOffset = 0;

  // 그리드 중앙 정렬 헬퍼
  function layoutRow(
    items: Company[],
    perRow: number,
    startY: number,
    nodeType: string
  ) {
    const rows = Math.ceil(items.length / perRow);
    for (let i = 0; i < items.length; i++) {
      const row = Math.floor(i / perRow);
      const colsInRow = Math.min(perRow, items.length - row * perRow);
      const col = i % perRow;
      // 중앙 정렬: 전체 폭 기준으로 해당 row의 아이템을 가운데 배치
      const totalWidth = (colsInRow - 1) * hGap;
      const offsetX = -totalWidth / 2 + col * hGap;

      nodes.push({
        id: items[i].id,
        type: nodeType,
        position: { x: offsetX, y: startY + row * vGap },
        data: { company: items[i], label: items[i].name },
      });
    }
    return startY + rows * vGap;
  }

  // ── 동일인(총수) ──
  if (controller) {
    nodes.push({
      id: controller.id,
      type: "company",
      position: { x: -NODE_W / 2, y: 0 },
      data: { company: controller, label: controller.name },
    });
    yOffset = NODE_H_CONTROLLER + Math.round(60 * scale);
  }

  // ── 지주회사 ──
  if (holding.length > 0) {
    const holdPerRow = Math.min(holding.length, 4);
    yOffset = layoutRow(holding, holdPerRow, yOffset, "company");
    yOffset += Math.round(40 * scale);
  }

  // ── 상장회사 ──
  if (listed.length > 0) {
    const listedPerRow = totalNodes > 35 ? 7 : totalNodes > 20 ? 6 : 5;
    yOffset = layoutRow(listed, listedPerRow, yOffset, "company");
    yOffset += Math.round(40 * scale);
  }

  // ── 비상장회사 ──
  if (unlisted.length > 0) {
    const unlistedPerRow = totalNodes > 35 ? 8 : totalNodes > 20 ? 7 : 6;
    layoutRow(unlisted, unlistedPerRow, yOffset, "company");
  }

  // ── 엣지 (회사 간 지분관계) ──
  const edges: Edge[] = [];

  relations.forEach((rel) => {
    const from = companyMap.get(rel.fromCompanyId);
    const to = companyMap.get(rel.toCompanyId);
    if (!from || !to) return;

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
