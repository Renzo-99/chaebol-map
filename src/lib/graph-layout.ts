import type { Node, Edge } from "@xyflow/react";
import type { Company, OwnershipRelation, ControllerHolding } from "@/types";

export interface CompanyNodeData {
  company: Company;
  label: string;
  [key: string]: unknown;
}

function getNodeType(company: Company): string {
  if (company.isController) return "controller";
  if (company.isListed) return "listed";
  if (company.isHolding) return "holding";
  return "unlisted";
}

function getNodeStyle(company: Company) {
  if (company.isController) {
    return {
      background: "#F59E0B",
      border: "2px solid #FCD34D",
      color: "#000",
    };
  }
  if (company.isListed) {
    return {
      background: "rgba(49, 130, 246, 0.15)",
      border: "2px solid #3182F6",
      color: "#F2F4F6",
    };
  }
  if (company.isHolding) {
    return {
      background: "rgba(34, 197, 94, 0.15)",
      border: "2px solid #22C55E",
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

  // Simple hierarchical layout
  const controller = companies.find((c) => c.isController);
  const listed = companies.filter((c) => c.isListed && !c.isController);
  const unlisted = companies.filter((c) => !c.isListed && !c.isController);

  const nodes: Node<CompanyNodeData>[] = [];
  let yOffset = 0;

  // Controller at top
  if (controller) {
    nodes.push({
      id: controller.id,
      type: "company",
      position: { x: 600, y: 0 },
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
    yOffset = 150;
  }

  // Listed companies in a grid
  const listedPerRow = 5;
  listed.forEach((company, i) => {
    const row = Math.floor(i / listedPerRow);
    const col = i % listedPerRow;
    nodes.push({
      id: company.id,
      type: "company",
      position: {
        x: col * 260 + 50,
        y: yOffset + row * 180,
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

  yOffset += Math.ceil(listed.length / listedPerRow) * 180 + 80;

  // Unlisted companies
  const unlistedPerRow = 6;
  unlisted.forEach((company, i) => {
    const row = Math.floor(i / unlistedPerRow);
    const col = i % unlistedPerRow;
    nodes.push({
      id: company.id,
      type: "company",
      position: {
        x: col * 220 + 30,
        y: yOffset + row * 150,
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
