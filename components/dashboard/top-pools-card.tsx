/**
 * Dashboard: TopPoolsCard — top 5 pools by current fee APR.
 */
"use client";

import Link from "next/link";
import { TrendingUp, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenPair } from "@/components/shared/token-pair";
import { ChainBadge } from "@/components/shared/chain-badge";
import { FeeTierBadge } from "@/components/shared/fee-tier-badge";
import { usePools } from "@/hooks/use-pools";
import { formatUSD, formatPct, aprClass } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function TopPoolsCard() {
  const { pools, isLoading } = usePools();

  // Top 5 by fee APR
  const top5 = pools.slice(0, 5);

  return (
    <Card className="glass">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-profit" />
          Top Pools by Fee APR
        </CardTitle>
        <Link
          href="/discover"
          className="text-xs text-primary flex items-center gap-1 hover:underline"
        >
          See all <ArrowRight className="w-3 h-3" />
        </Link>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))
            : top5.map((pool, rank) => (
                <Link
                  key={`${pool.chainId}-${pool.id}`}
                  href={`/explorer?pool=${pool.id}&chain=${pool.chainId}`}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/60 transition-colors group"
                >
                  {/* Rank + pair */}
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center text-xs font-bold text-muted-foreground">
                      {rank + 1}
                    </span>
                    <TokenPair
                      token0={pool.token0}
                      token1={pool.token1}
                      size="sm"
                    />
                    <div className="flex gap-1">
                      <FeeTierBadge feeTier={pool.feeTier} />
                      <ChainBadge chainId={pool.chainId} />
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-6 text-right">
                    <div className="hidden sm:block">
                      <p className="text-xs text-muted-foreground">TVL</p>
                      <p className="text-xs font-medium tabular-nums">
                        {formatUSD(pool.totalValueLockedUSD, true)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">24h Vol</p>
                      <p className="text-xs font-medium tabular-nums">
                        {formatUSD(pool.volumeUSD24h, true)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Fee APR</p>
                      <p className={cn("text-sm font-bold tabular-nums", aprClass(pool.feeAPR ?? 0))}>
                        {formatPct(pool.feeAPR ?? 0, 1)}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
        </div>
      </CardContent>
    </Card>
  );
}
