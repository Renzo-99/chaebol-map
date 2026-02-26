import type { Node, Edge } from "@xyflow/react";
import type { Company, OwnershipRelation, ControllerHolding } from "@/types";

export interface CompanyNodeData {
  company: Company;
  label: string;
  [key: string]: unknown;
}

function getNodeStyle(company: Company) {
  if (company.isController) {
    return {
      background: "#F59E0B",
      border: "2px solid #FCD34D",
      color: "#000",
    };
  }
  if (company.isHolding) {
    return {
      background: "rgba(34, 197, 94, 0.15)",
      border: "2px solid #22C55E",
      color: "#F2F4F6",
    };
  }
  if (company.isListed) {
    return {
      background: "rgba(49, 130, 246, 0.15)",
      border: "2px solid #3182F6",
      color: "#F2F4F6",
    };
  }
  return {
    background: "rgba(100, 116, 139, 0.15)",
    border: "1px solid #475569",
    color: "#94A3B8",
  };
}

function getEdgeStyle(pct: number) {
  if (pct >= 50) {
    return { strokeWidth: 3, stroke: "#F59E0B" };
  }
  if (pct >= 20) {
    return { strokeWidth: 2, stroke: "#3182F6" };
  }
  if (pct >= 5) {
    return { strokeWidth: 1.5, stroke: "#64748B" };
  }
  return { strokeWidth: 1, stroke: "#475569", strokeDasharray: "5,5" };
}

export function buildGraphData(
  companies: Company[],
  relations: OwnershipRelation[],
  controllerHoldings: ControllerHolding[]
): { nodes: Node<CompanyNodeData>[]; edges: Edge[] } {
  const companyMap = new Map(companies.map((c) => [c.id, c]));

  // Categorize companies
  const controller = companies.find((c) => c.isController);
  const holding = companies.filter((c) => c.isHolding && !c.isController);
  const listed = companies.filter((c) => c.isListed && !c.isController && !c.isHolding);
  const unlisted = companies.filter((c) => !c.isListed && !c.isController && !c.isHolding);

  // Adaptive layout based on total node count
  const totalNodes = companies.length;
  const scale = totalNodes > 40 ? 0.85 : totalNodes > 25 ? 0.9 : 1;
  const hGap = Math.round(250 * scale);
  const vGap = Math.round(170 * scale);

  const nodes: Node<CompanyNodeData>[] = [];
  let yOffset = 0;

  // Controller at top center
  if (controller) {
    const maxCols = Math.max(listed.length, holding.length, 5);
    const perRow = Math.min(maxCols, totalNodes > 30 ? 6 : 5);
    const cx = Math.round((perRow * hGap) / 2);
    nodes.push({
      id: controller.id,
      type: "company",
      position: { x: cx, y: 0 },
      data: { company: controller, label: controller.name },
      style: {
        ...getNodeStyle(controller),
        borderRadius: "16px",
        padding: "12px 20px",
        fontSize: "14px",
        fontWeight: "700",
        minWidth: "120px",
        textAlign: "center" as const,
      },
    });
    yOffset = Math.round(150 * scale);
  }

  // Holding companies (tier 1)
  if (holding.length > 0) {
    const holdPerRow = Math.min(holding.length, 4);
    holding.forEach((company, i) => {
      const row = Math.floor(i / holdPerRow);
      const col = i % holdPerRow;
      nodes.push({
        id: company.id,
        type: "company",
        position: {
          x: col * hGap + 50,
          y: yOffset + row * vGap,
        },
        data: { company, label: company.name },
        style: {
          ...getNodeStyle(company),
          borderRadius: "14px",
          padding: "10px 18px",
          fontSize: "13px",
          fontWeight: "600",
          minWidth: "110px",
          textAlign: "center" as const,
        },
      });
    });
    yOffset += Math.ceil(holding.length / holdPerRow) * vGap + Math.round(60 * scale);
  }

  // Listed companies in a grid
  const listedPerRow = totalNodes > 30 ? 6 : 5;
  listed.forEach((company, i) => {
    const row = Math.floor(i / listedPerRow);
    const col = i % listedPerRow;
    nodes.push({
      id: company.id,
      type: "company",
      position: {
        x: col * hGap + 50,
        y: yOffset + row * vGap,
      },
      data: { company, label: company.name },
      style: {
        ...getNodeStyle(company),
        borderRadius: "12px",
        padding: "10px 16px",
        fontSize: "12px",
        fontWeight: "600",
        minWidth: "100px",
        textAlign: "center" as const,
      },
    });
  });

  if (listed.length > 0) {
    yOffset += Math.ceil(listed.length / listedPerRow) * vGap + Math.round(60 * scale);
  }

  // Unlisted companies
  const unlistedPerRow = totalNodes > 30 ? 7 : 6;
  const uGap = Math.round(210 * scale);
  const uVGap = Math.round(140 * scale);
  unlisted.forEach((company, i) => {
    const row = Math.floor(i / unlistedPerRow);
    const col = i % unlistedPerRow;
    nodes.push({
      id: company.id,
      type: "company",
      position: {
        x: col * uGap + 30,
        y: yOffset + row * uVGap,
      },
      data: { company, label: company.name },
      style: {
        ...getNodeStyle(company),
        borderRadius: "10px",
        padding: "8px 12px",
        fontSize: "11px",
        fontWeight: "500",
        minWidth: "80px",
        textAlign: "center" as const,
      },
    });
  });

  // Build edges from relations
  const edges: Edge[] = [];

  relations.forEach((rel) => {
    const from = companyMap.get(rel.fromCompanyId);
    const to = companyMap.get(rel.toCompanyId);
    if (!from || !to) return;

    const style = getEdgeStyle(rel.ownershipPct);
    edges.push({
      id: rel.id,
      source: rel.fromCompanyId,
      target: rel.toCompanyId,
      label: `${rel.ownershipPct}%`,
      type: "smoothstep",
      animated: rel.ownershipPct >= 50,
      style,
      labelStyle: {
        fontSize: "10px",
        fontWeight: "600",
        fill: "#94A3B8",
      },
      labelBgStyle: {
        fill: "#212830",
        fillOpacity: 0.9,
      },
      labelBgPadding: [4, 8] as [number, number],
      labelBgBorderRadius: 6,
    });
  });

  // Controller holdings edges
  if (controller) {
    controllerHoldings.forEach((holding, i) => {
      const style = getEdgeStyle(holding.ownershipPct);
      edges.push({
        id: `ctrl-${i}`,
        source: controller.id,
        target: holding.companyId,
        label: `${holding.ownershipPct}%`,
        type: "smoothstep",
        style,
        labelStyle: {
          fontSize: "10px",
          fontWeight: "600",
          fill: "#FCD34D",
        },
        labelBgStyle: {
          fill: "#212830",
          fillOpacity: 0.9,
        },
        labelBgPadding: [4, 8] as [number, number],
        labelBgBorderRadius: 6,
      });
    });
  }

  return { nodes, edges };
}
