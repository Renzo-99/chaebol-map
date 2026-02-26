"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Star, TrendingUp, TrendingDown, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OwnershipGraph } from "@/components/graph/OwnershipGraph";
import type { GroupData } from "@/types";
import { formatNumber } from "@/lib/utils";

const groupIcons: Record<string, string> = {
  samsung: "🏢", sk: "⚡", hyundai: "🚗", lg: "📱", lotte: "🏬",
  posco: "🔩", hanwha: "🚀", "hd-hyundai": "🚢", gs: "⛽", shinsegae: "🛍️",
  hanjin: "✈️", kt: "📡", cj: "🎬", ls: "🔌", kakao: "💬",
  doosan: "⚙️", dl: "🏗️", jungheung: "🏠", celltrion: "💊", naver: "🌐",
  "mirae-asset": "📊", coupang: "📦", hankook: "🛞", booyoung: "🏘️",
  youngpoong: "⛏️", harim: "🐔", hyosung: "🧵", sm: "🚢", hdc: "🏙️",
};

interface GroupDetailClientProps {
  data: GroupData;
}

export function GroupDetailClient({ data }: GroupDetailClientProps) {
  const [view, setView] = useState<"graph" | "list">("graph");
  const { group, companies } = data;

  const listedCompanies = companies
    .filter((c) => c.isListed && !c.isController)
    .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));

  const totalMarketCap = listedCompanies.reduce(
    (sum, c) => sum + (c.marketCap ?? 0),
    0
  );

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/groups">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{groupIcons[group.slug] ?? "🏢"}</span>
              <div>
                <h1 className="text-xl font-bold">{group.name}그룹 소유지분도</h1>
                <p className="text-sm text-muted-foreground">
                  동일인: {group.controllerName} · {group.dataDate} 기준
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="hidden md:flex items-center gap-4 mr-4">
              <div className="flex items-center gap-1.5 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">계열사</span>
                <span className="font-bold">{group.totalCompanies}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-muted-foreground">상장</span>
                <span className="font-bold">{group.listedCompanies}</span>
              </div>
              {totalMarketCap > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">시총</span>
                  <span className="font-bold">{formatNumber(totalMarketCap)}</span>
                </div>
              )}
            </div>

            {/* View toggle */}
            <div className="flex items-center bg-muted rounded-xl p-1">
              <button
                onClick={() => setView("graph")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  view === "graph"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                지분도
              </button>
              <button
                onClick={() => setView("list")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  view === "list"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                <List className="w-3.5 h-3.5 inline mr-1" />
                목록
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {view === "graph" ? (
        <div className="flex-1">
          <OwnershipGraph data={data} />
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="max-w-screen-xl mx-auto">
            <h2 className="text-lg font-bold mb-4">
              상장 계열사 ({listedCompanies.length})
            </h2>
            <div className="space-y-2">
              {listedCompanies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <div>
                      <p className="font-semibold">{company.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="sector">{company.category}</Badge>
                        {company.stockCode && (
                          <Badge variant="outline">{company.stockCode}</Badge>
                        )}
                        {company.sector && (
                          <span className="text-xs text-muted-foreground">
                            {company.sector}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {company.stockPrice && (
                      <>
                        <p className="font-bold">
                          {company.stockPrice.toLocaleString()}원
                        </p>
                        <div
                          className={`flex items-center justify-end gap-1 text-sm ${
                            (company.priceChangePercent ?? 0) > 0
                              ? "text-red-400"
                              : (company.priceChangePercent ?? 0) < 0
                              ? "text-blue-400"
                              : "text-gray-400"
                          }`}
                        >
                          {(company.priceChangePercent ?? 0) > 0 ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : (company.priceChangePercent ?? 0) < 0 ? (
                            <TrendingDown className="w-3.5 h-3.5" />
                          ) : null}
                          <span className="font-semibold">
                            {(company.priceChangePercent ?? 0) > 0 ? "+" : ""}
                            {(company.priceChangePercent ?? 0).toFixed(2)}%
                          </span>
                        </div>
                        {company.marketCap && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            시총 {formatNumber(company.marketCap)}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
