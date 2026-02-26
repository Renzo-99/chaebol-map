import Link from "next/link";
import { ArrowRight, Building2, Star } from "lucide-react";
import { getAllGroups } from "@/lib/data";

const groupIcons: Record<string, string> = {
  samsung: "🏢", sk: "⚡", hyundai: "🚗", lg: "📱", lotte: "🏬",
  posco: "🔩", hanwha: "🚀", "hd-hyundai": "🚢", gs: "⛽", shinsegae: "🛍️",
  hanjin: "✈️", kt: "📡", cj: "🎬", ls: "🔌", kakao: "💬",
  doosan: "⚙️", dl: "🏗️", jungheung: "🏠", celltrion: "💊", naver: "🌐",
  "mirae-asset": "📊", coupang: "📦", hankook: "🛞", booyoung: "🏘️",
  youngpoong: "⛏️", harim: "🐔", hyosung: "🧵", sm: "🚢", hdc: "🏙️",
};

export default async function GroupsPage() {
  const groups = await getAllGroups();

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">전체 그룹</h1>
        <p className="text-sm text-muted-foreground mt-1">
          한국 주요 대기업 그룹 소유지분도 ({groups.length}개 그룹)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map((g) => {
          const topStocks = g.companies
            .filter((c) => c.isListed && !c.isController && c.marketCap)
            .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
            .slice(0, 3);

          return (
            <Link key={g.group.id} href={`/groups/${g.group.slug}`} className="group">
              <div className="rounded-2xl bg-card border border-border/50 p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{groupIcons[g.group.slug] ?? "🏢"}</span>
                    <div>
                      <h3 className="text-lg font-bold">{g.group.name}그룹</h3>
                      <p className="text-sm text-muted-foreground">{g.group.controllerName}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>

                <div className="flex items-center gap-6 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    <span>{g.group.totalCompanies}사</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4" />
                    <span>상장 {g.group.listedCompanies}사</span>
                  </div>
                </div>

                {topStocks.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-border/30">
                    {topStocks.map((stock) => (
                      <div key={stock.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate mr-2">{stock.name}</span>
                        <span className={`font-semibold text-xs px-2 py-0.5 rounded-md ${
                          (stock.priceChangePercent ?? 0) > 0
                            ? "text-red-400 bg-red-500/10"
                            : (stock.priceChangePercent ?? 0) < 0
                            ? "text-blue-400 bg-blue-500/10"
                            : "text-gray-400 bg-gray-500/10"
                        }`}>
                          {(stock.priceChangePercent ?? 0) > 0 ? "+" : ""}
                          {(stock.priceChangePercent ?? 0).toFixed(2)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
