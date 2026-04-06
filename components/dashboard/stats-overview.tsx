/**
 * Dashboard: StatsOverview — protocol-level totals in 3 stat cards.
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Layers, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChainBadge } from "@/components/shared/chain-badge";
import { formatUSD } from "@/lib/utils";
import type { ChainId } from "@/types";

interface GlobalMetrics {
  totals: {
    totalValueLockedUSD: number;
    totalVolumeUSD: number;
    totalFeesUSD: number;
    poolCount: number;
  };
  chains: Array<{
    chainId: ChainId;
    totalValueLockedUSD: number;
    totalVolumeUSD: number;
    poolCount: number;
  }>;
}

function useGlobalMetrics() {
  return useQuery<GlobalMetrics>({
    queryKey: ["metrics", "global"],
    queryFn: async () => {
      const res = await fetch("/api/metrics");
      if (!res.ok) throw new Error("Failed to fetch global metrics");
      return res.json();
    },
    staleTime: 110_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
  });
}

const STATS = [
  {
    key: "totalValueLockedUSD" as const,
    label: "Total TVL (preferred pools)",
    icon: Layers,
    colour: "text-primary",
  },
  {
    key: "totalVolumeUSD" as const,
    label: "24h Volume",
    icon: Activity,
    colour: "text-cyan-400",
  },
  {
    key: "totalFeesUSD" as const,
    label: "24h Fees",
    icon: TrendingUp,
    colour: "text-profit",
  },
];

export function StatsOverview() {
  const { data, isLoading } = useGlobalMetrics();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {STATS.map(({ key, label, icon: Icon, colour }) => (
        <Card key={key} className="glass">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-32 mt-1" />
                ) : (
                  <p className="text-2xl font-bold tabular-nums mt-0.5">
                    {formatUSD(data?.totals[key] ?? 0, true)}
                  </p>
                )}
              </div>
              <div className={`p-2 rounded-lg bg-secondary ${colour}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            {/* Per-chain breakdown */}
            {!isLoading && data && (
              <div className="flex gap-3 mt-3 pt-3 border-t border-border">
                {data.chains.map((c) => (
                  <div key={c.chainId} className="flex items-center gap-1.5">
                    <ChainBadge chainId={c.chainId} />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatUSD(c[key === "totalFeesUSD" ? "totalValueLockedUSD" : key] ?? 0, true)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
