"use client";

import { useState } from "react";
import { BarChart3, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenPair } from "@/components/shared/token-pair";
import { ChainBadge } from "@/components/shared/chain-badge";
import { FeeTierBadge } from "@/components/shared/fee-tier-badge";
import { usePools } from "@/hooks/use-pools";
import { formatUSD, formatPct, aprClass } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Pool } from "@/types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function PoolDetailPanel({ pool }: { pool: Pool }) {
  const dayData = (pool.poolDayData ?? []).slice(0, 30).reverse();

  const volumeData = dayData.map((d) => ({
    date: new Date(d.date * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    volume: d.volumeUSD,
    fees: d.feesUSD,
    tvl: d.tvlUSD,
  }));

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <TokenPair token0={pool.token0} token1={pool.token1} size="md" />
            <FeeTierBadge feeTier={pool.feeTier} />
            <ChainBadge chainId={pool.chainId} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          {[
            { label: "TVL", value: formatUSD(pool.totalValueLockedUSD, true) },
            { label: "24h Volume", value: formatUSD(pool.volumeUSD24h, true) },
            { label: "Fee APR", value: formatPct(pool.feeAPR ?? 0, 1), colour: aprClass(pool.feeAPR ?? 0) },
            { label: "7d APR", value: formatPct(pool.feeAPR7d ?? 0, 1), colour: aprClass(pool.feeAPR7d ?? 0) },
          ].map(({ label, value, colour }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={cn("text-base font-bold tabular-nums mt-0.5", colour ?? "text-foreground")}>{value}</p>
            </div>
          ))}
        </div>

        {/* Volume chart */}
        <p className="text-xs text-muted-foreground mb-2">30-day Volume & TVL</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={volumeData}>
            <defs>
              <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
            <Tooltip
              formatter={(value: number, name: string) => [formatUSD(value, true), name === "volume" ? "Volume" : "TVL"]}
              contentStyle={{ background: "hsl(222,47%,9%)", border: "1px solid hsl(217,32%,18%)", borderRadius: 6, fontSize: 11 }}
            />
            <Area type="monotone" dataKey="volume" stroke="#3B82F6" fill="url(#volGrad)" strokeWidth={1.5} />
            <Area type="monotone" dataKey="tvl" stroke="#22c55e" fill="url(#tvlGrad)" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default function ExplorerPage() {
  const { allPools, isLoading } = usePools();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Pool | null>(null);

  const filtered = allPools.filter((p) => {
    const q = search.toLowerCase();
    return `${p.token0.symbol}/${p.token1.symbol} ${p.id}`.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Pool Explorer
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Browse all preferred pools with volume charts and liquidity data.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search by token or address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Pool list */}
        <div className="lg:w-72 space-y-1.5">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            : filtered.map((pool) => (
                <button
                  key={`${pool.chainId}-${pool.id}`}
                  onClick={() => setSelected(pool)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all",
                    selected?.id === pool.id && selected?.chainId === pool.chainId
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40 hover:bg-secondary/40",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <TokenPair token0={pool.token0} token1={pool.token1} size="sm" />
                    <FeeTierBadge feeTier={pool.feeTier} />
                  </div>
                  <div className="text-right">
                    <p className={cn("text-xs font-semibold tabular-nums", aprClass(pool.feeAPR ?? 0))}>
                      {formatPct(pool.feeAPR ?? 0, 1)}
                    </p>
                    <ChainBadge chainId={pool.chainId} size="sm" />
                  </div>
                </button>
              ))}
        </div>

        {/* Detail panel */}
        <div className="flex-1">
          {selected ? (
            <PoolDetailPanel pool={selected} />
          ) : (
            <div className="flex flex-col items-center justify-center h-60 text-muted-foreground gap-2 rounded-lg border border-border">
              <BarChart3 className="w-8 h-8" />
              <p className="text-sm">Select a pool to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
