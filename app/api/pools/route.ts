/**
 * API route: GET /api/pools?chainId=1
 *
 * Fetches top Uniswap V3 pools for the preferred tokens on the given chain,
 * computes fee APR / volume metrics, and returns enriched Pool objects.
 */
import { NextRequest, NextResponse } from "next/server";
import { querySubgraph } from "@/lib/subgraph";
import {
  PREFERRED_TOKENS,
  TOKEN_MAP,
  CACHE_TTL,
  MIN_POOL_TVL_USD,
} from "@/lib/constants";
import {
  calculateFeeAPR,
  calcVolumeToTVL,
} from "@/lib/calculations";
import {
  POOLS_BY_TOKEN0_QUERY,
  POOLS_BY_TOKEN1_QUERY,
} from "@/queries/pools";
import type { ChainId, Pool, SubgraphPool } from "@/types";

// ─── Types returned from subgraph ─────────────────────────────────────────

interface SubgraphPoolData {
  pools: SubgraphPool[];
}

// ─── Transform subgraph pool → enriched Pool ───────────────────────────────

function transformPool(raw: SubgraphPool, chainId: ChainId): Pool {
  const tokenMap = TOKEN_MAP[chainId];
  const decimals0 = parseInt(raw.token0.decimals);
  const decimals1 = parseInt(raw.token1.decimals);

  // Compute 24h and 7d metrics from poolDayData (most recent days first)
  const dayData = (raw.poolDayData ?? []).slice(0, 8);
  const volumeUSD24h = parseFloat(dayData[0]?.volumeUSD ?? "0");
  const feesUSD24h = parseFloat(dayData[0]?.feesUSD ?? "0");
  const volumeUSD7d = dayData.slice(0, 7).reduce((s, d) => s + parseFloat(d.volumeUSD), 0);
  const feesUSD7d = dayData.slice(0, 7).reduce((s, d) => s + parseFloat(d.feesUSD), 0);
  const tvlUSD = parseFloat(raw.totalValueLockedUSD);

  const feeAPR = calculateFeeAPR(feesUSD24h, tvlUSD, 1);
  const feeAPR7d = calculateFeeAPR(feesUSD7d, tvlUSD, 7);
  const volumeToTVL = calcVolumeToTVL(volumeUSD24h, tvlUSD);

  const addr0 = raw.token0.id.toLowerCase();
  const addr1 = raw.token1.id.toLowerCase();

  const token0 = tokenMap[addr0] ?? {
    address: addr0,
    symbol: raw.token0.symbol,
    name: raw.token0.name,
    decimals: decimals0,
  };
  const token1 = tokenMap[addr1] ?? {
    address: addr1,
    symbol: raw.token1.symbol,
    name: raw.token1.name,
    decimals: decimals1,
  };

  return {
    id: raw.id.toLowerCase(),
    chainId,
    token0,
    token1,
    feeTier: parseInt(raw.feeTier),
    sqrtPriceX96: raw.sqrtPrice,
    tick: parseInt(raw.tick ?? "0"),
    liquidity: raw.liquidity,
    totalValueLockedToken0: parseFloat(raw.totalValueLockedToken0),
    totalValueLockedToken1: parseFloat(raw.totalValueLockedToken1),
    totalValueLockedUSD: tvlUSD,
    volumeUSD: parseFloat(raw.volumeUSD),
    feesUSD: parseFloat(raw.feesUSD),
    volumeUSD24h,
    feesUSD24h,
    volumeUSD7d,
    feesUSD7d,
    txCount: parseInt(raw.txCount),
    token0Price: parseFloat(raw.token0Price),
    token1Price: parseFloat(raw.token1Price),
    feeAPR,
    feeAPR7d,
    volumeToTVL,
    createdAtTimestamp: parseInt(raw.createdAtTimestamp),
    poolDayData: (raw.poolDayData ?? []).map((d) => ({
      date: d.date,
      volumeUSD: parseFloat(d.volumeUSD),
      feesUSD: parseFloat(d.feesUSD),
      tvlUSD: parseFloat(d.tvlUSD),
      open: parseFloat(d.open),
      high: parseFloat(d.high),
      low: parseFloat(d.low),
      close: parseFloat(d.close),
      txCount: parseInt(d.txCount ?? "0"),
    })),
  };
}

// ─── Route handler ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const chainId = parseInt(searchParams.get("chainId") ?? "1") as ChainId;

  if (![1, 8453, 56].includes(chainId)) {
    return NextResponse.json({ error: "Invalid chainId" }, { status: 400 });
  }

  const tokenAddresses = PREFERRED_TOKENS[chainId];

  try {
    // The Graph doesn't support OR in where filters, so we query by token0 and token1 separately
    const [byToken0, byToken1] = await Promise.all([
      querySubgraph<SubgraphPoolData>(chainId, POOLS_BY_TOKEN0_QUERY, {
        token0_in: tokenAddresses,
        first: 100,
        minTVL: MIN_POOL_TVL_USD.toString(),
      }),
      querySubgraph<SubgraphPoolData>(chainId, POOLS_BY_TOKEN1_QUERY, {
        token1_in: tokenAddresses,
        first: 100,
        minTVL: MIN_POOL_TVL_USD.toString(),
      }),
    ]);

    // Merge + deduplicate (by pool id)
    const seen = new Set<string>();
    const raw: SubgraphPool[] = [];
    for (const pool of [...(byToken0.pools ?? []), ...(byToken1.pools ?? [])]) {
      if (!seen.has(pool.id)) {
        seen.add(pool.id);
        raw.push(pool);
      }
    }

    // Filter: both tokens must be in our preferred list for maximum relevance
    const preferred = new Set(tokenAddresses);
    const filtered = raw.filter(
      (p) => preferred.has(p.token0.id.toLowerCase()) && preferred.has(p.token1.id.toLowerCase()),
    );

    const pools = filtered.map((p) => transformPool(p, chainId));

    // Sort by fee APR descending
    pools.sort((a, b) => (b.feeAPR ?? 0) - (a.feeAPR ?? 0));

    return NextResponse.json(
      { pools, fetchedAt: Date.now() },
      {
        headers: {
          "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (err: unknown) {
    console.error("[/api/pools]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, pools: [] }, { status: 500 });
  }
}
