import type { GroupData } from "@/types";

const dataModules: Record<string, () => Promise<GroupData>> = {
  samsung: () => import("@/data/samsung.json").then((m) => m.default as unknown as GroupData),
  sk: () => import("@/data/sk.json").then((m) => m.default as unknown as GroupData),
  hyundai: () => import("@/data/hyundai.json").then((m) => m.default as unknown as GroupData),
  lg: () => import("@/data/lg.json").then((m) => m.default as unknown as GroupData),
  lotte: () => import("@/data/lotte.json").then((m) => m.default as unknown as GroupData),
  posco: () => import("@/data/posco.json").then((m) => m.default as unknown as GroupData),
  hanwha: () => import("@/data/hanwha.json").then((m) => m.default as unknown as GroupData),
  "hd-hyundai": () => import("@/data/hd-hyundai.json").then((m) => m.default as unknown as GroupData),
  gs: () => import("@/data/gs.json").then((m) => m.default as unknown as GroupData),
  shinsegae: () => import("@/data/shinsegae.json").then((m) => m.default as unknown as GroupData),
  hanjin: () => import("@/data/hanjin.json").then((m) => m.default as unknown as GroupData),
  kt: () => import("@/data/kt.json").then((m) => m.default as unknown as GroupData),
  cj: () => import("@/data/cj.json").then((m) => m.default as unknown as GroupData),
  ls: () => import("@/data/ls.json").then((m) => m.default as unknown as GroupData),
  kakao: () => import("@/data/kakao.json").then((m) => m.default as unknown as GroupData),
};

export async function getGroupData(slug: string): Promise<GroupData | null> {
  const loader = dataModules[slug];
  if (!loader) return null;
  return loader();
}

export async function getAllGroups(): Promise<GroupData[]> {
  const results = await Promise.all(
    Object.values(dataModules).map((loader) => loader())
  );
  return results;
}

export const groupSlugs = Object.keys(dataModules);
