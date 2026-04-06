/**
 * API route: GET /api/metrics
 * Returns aggregated protocol stats for the dashboard header.
 * Data sourced from GeckoTerminal (TVL, 24h volume, 24h fees).
 */
import { NextResponse } from "next/server";
import { getUniswapPools } from "@/lib/geckoterminal";
import { SUPPORTED_CHAINS, CACHE_TTL } from "@/lib/constants";
import type { ChainId } from "@/types";

export async function GET() {
  interface ChainStats {
    chainId: ChainId;
    totalValueLockedUSD: number;
    totalVolumeUSD: number;
    totalFeesUSD: number;
    poolCount: number;
  }

  const results = await Promise.allSettled(
    SUPPORTED_CHAINS.map(async (chainId: ChainId): Promise<ChainStats | null> => {
      const pools = await getUniswapPools(chainId);
      if (!pools.length) return null;
      return {
        chainId,
        totalValueLockedUSD: pools.reduce((s, p) => s + p.totalValueLockedUSD, 0),
        totalVolumeUSD: pools.reduce((s, p) => s + p.volumeUSD24h, 0),
        totalFeesUSD: pools.reduce((s, p) => s + p.feesUSD24h, 0),
        poolCount: pools.length,
      };
    }),
  );

  const chains = results
    .filter((r): r is PromiseFulfilledResult<ChainStats> => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value);

  const totals = chains.reduce(
    (acc, c) => ({
      totalValueLockedUSD: acc.totalValueLockedUSD + (c?.totalValueLockedUSD ?? 0),
      totalVolumeUSD: acc.totalVolumeUSD + (c?.totalVolumeUSD ?? 0),
      totalFeesUSD: acc.totalFeesUSD + (c?.totalFeesUSD ?? 0),
      poolCount: acc.poolCount + (c?.poolCount ?? 0),
    }),
    { totalValueLockedUSD: 0, totalVolumeUSD: 0, totalFeesUSD: 0, poolCount: 0 },
  );

  return NextResponse.json(
    { totals, chains, fetchedAt: Date.now() },
    {
      headers: {
        "Cache-Control": `s-maxage=${CACHE_TTL}, stale-while-revalidate=120`,
      },
    },
  );
}
