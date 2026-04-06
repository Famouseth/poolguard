/**
 * API route: GET /api/metrics/global
 * Returns aggregated protocol stats for the dashboard header.
 */
import { NextResponse } from "next/server";
import { querySubgraph } from "@/lib/subgraph";
import { GLOBAL_STATS_QUERY } from "@/queries/pools";
import { SUPPORTED_CHAINS, CACHE_TTL } from "@/lib/constants";
import type { ChainId } from "@/types";

interface Factory {
  txCount: string;
  totalVolumeUSD: string;
  totalFeesUSD: string;
  totalValueLockedUSD: string;
  poolCount: string;
}

interface GlobalStatsData {
  factories: Factory[];
}

export async function GET() {
  interface ChainStats {
    chainId: ChainId;
    totalValueLockedUSD: number;
    totalVolumeUSD: number;
    totalFeesUSD: number;
    poolCount: number;
    txCount: number;
  }

  const results = await Promise.allSettled(
    SUPPORTED_CHAINS.map(async (chainId: ChainId): Promise<ChainStats | null> => {
      const data = await querySubgraph<GlobalStatsData>(chainId, GLOBAL_STATS_QUERY);
      const f = data.factories?.[0];
      if (!f) return null;
      return {
        chainId,
        totalValueLockedUSD: parseFloat(f.totalValueLockedUSD),
        totalVolumeUSD: parseFloat(f.totalVolumeUSD),
        totalFeesUSD: parseFloat(f.totalFeesUSD),
        poolCount: parseInt(f.poolCount),
        txCount: parseInt(f.txCount),
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
