/**
 * API route: GET /api/positions?owner=0x...&chainId=1
 *
 * Fetches all active Uniswap V3 positions for an owner, enriches them
 * with computed metrics (fee APR, PnL, IL, health score).
 */
import { NextRequest, NextResponse } from "next/server";
import { querySubgraph } from "@/lib/subgraph";
import { TOKEN_MAP } from "@/lib/constants";
import {
  tickToPrice,
  sqrtPriceX96ToPrice,
  calcRangeProgress,
  calculatePositionMetrics,
  calculateFeeAPR,
} from "@/lib/calculations";
import { daysSince } from "@/lib/utils";
import { POSITIONS_BY_OWNER_QUERY } from "@/queries/positions";
import type { ChainId, Position, SubgraphPosition, TokenInfo } from "@/types";

interface SubgraphPositionsData {
  positions: SubgraphPosition[];
}

// ─── Transform subgraph position → enriched Position ─────────────────────

function transformPosition(raw: SubgraphPosition, chainId: ChainId): Position {
  const tokenMap = TOKEN_MAP[chainId];
  const pool = raw.pool;

  const addr0 = pool.token0.id.toLowerCase();
  const addr1 = pool.token1.id.toLowerCase();
  const decimals0 = parseInt(pool.token0.decimals);
  const decimals1 = parseInt(pool.token1.decimals);

  const token0: TokenInfo = tokenMap[addr0] ?? {
    address: addr0,
    symbol: pool.token0.symbol,
    name: pool.token0.name,
    decimals: decimals0,
  };
  const token1: TokenInfo = tokenMap[addr1] ?? {
    address: addr1,
    symbol: pool.token1.symbol,
    name: pool.token1.name,
    decimals: decimals1,
  };

  const tickLower = parseInt(raw.tickLower.tickIdx);
  const tickUpper = parseInt(raw.tickUpper.tickIdx);
  const currentTick = parseInt(pool.tick ?? "0");

  const priceLower = tickToPrice(tickLower, decimals0, decimals1);
  const priceUpper = tickToPrice(tickUpper, decimals0, decimals1);
  const currentPrice = sqrtPriceX96ToPrice(pool.sqrtPrice, decimals0, decimals1);

  const inRange = currentTick >= tickLower && currentTick < tickUpper;
  const rangeProgress = calcRangeProgress(currentTick, tickLower, tickUpper);

  // Deposited / fees / withdrawn (from subgraph)
  const dep0 = parseFloat(raw.depositedToken0);
  const dep1 = parseFloat(raw.depositedToken1);
  const with0 = parseFloat(raw.withdrawnToken0);
  const with1 = parseFloat(raw.withdrawnToken1);
  const fees0 = parseFloat(raw.collectedFeesToken0);
  const fees1 = parseFloat(raw.collectedFeesToken1);

  // Current token amounts: subgraph stores net deposited − withdrawn
  // (actual current amounts require on-chain call; we use subgraph approximation)
  const amount0 = Math.max(0, dep0 - with0);
  const amount1 = Math.max(0, dep1 - with1);

  // USD values (use pool's current price ratios)
  const tvlUSD = parseFloat(pool.totalValueLockedUSD);
  const tvlToken0 = parseFloat(pool.totalValueLockedToken0) || 1;
  const tvlToken1 = parseFloat(pool.totalValueLockedToken1) || 1;
  const token0PriceUSD = tvlUSD / (tvlToken0 + tvlToken1 * parseFloat(pool.token0Price || "1")) || 0;
  const token1PriceUSD = token0PriceUSD * parseFloat(pool.token0Price || "1");

  const amount0USD = amount0 * token0PriceUSD;
  const amount1USD = amount1 * token1PriceUSD;
  const totalValueUSD = amount0USD + amount1USD;

  // Uncollected fees not in basic subgraph — set to 0 (requires on-chain call)
  const uncollectedFees0 = 0;
  const uncollectedFees1 = 0;
  const uncollectedFeesUSD = 0;

  const collectedFeesUSD = fees0 * token0PriceUSD + fees1 * token1PriceUSD;
  const totalFeesUSD = collectedFeesUSD + uncollectedFeesUSD;

  const depositedUSD = dep0 * token0PriceUSD + dep1 * token1PriceUSD;
  const withdrawnUSD = with0 * token0PriceUSD + with1 * token1PriceUSD;

  const createdAtTimestamp = parseInt(raw.transaction?.timestamp ?? "0");
  const ageInDays = daysSince(createdAtTimestamp);

  // Pool-level fee data for APR
  const dayData = pool.poolDayData ?? [];
  const feesUSD24h = parseFloat(dayData[0]?.feesUSD ?? "0");

  const metrics = calculatePositionMetrics({
    currentValueUSD: totalValueUSD,
    totalFeesUSD,
    depositedUSD,
    withdrawnUSD,
    depositedToken0: dep0,
    depositedToken1: dep1,
    token0PriceUSD,
    token1PriceUSD,
    ageInDays,
    inRange,
    rangeProgress,
  });

  return {
    id: raw.id,
    chainId,
    owner: raw.owner.toLowerCase(),
    pool: {
      id: pool.id.toLowerCase(),
      chainId,
      token0,
      token1,
      feeTier: parseInt(pool.feeTier),
      sqrtPriceX96: pool.sqrtPrice,
      tick: currentTick,
      liquidity: pool.liquidity,
      totalValueLockedToken0: parseFloat(pool.totalValueLockedToken0),
      totalValueLockedToken1: parseFloat(pool.totalValueLockedToken1),
      totalValueLockedUSD: tvlUSD,
      volumeUSD: parseFloat(pool.volumeUSD),
      feesUSD: parseFloat(pool.feesUSD),
      volumeUSD24h: parseFloat(dayData[0]?.volumeUSD ?? "0"),
      feesUSD24h,
      volumeUSD7d: dayData.slice(0, 7).reduce((s, d) => s + parseFloat(d.volumeUSD || "0"), 0),
      feesUSD7d: dayData.slice(0, 7).reduce((s, d) => s + parseFloat(d.feesUSD || "0"), 0),
      txCount: parseInt(pool.txCount ?? "0"),
      token0Price: parseFloat(pool.token0Price),
      token1Price: parseFloat(pool.token1Price),
      feeAPR: calculateFeeAPR(feesUSD24h, tvlUSD, 1),
      createdAtTimestamp: parseInt(pool.createdAtTimestamp ?? "0"),
    },
    tickLower,
    tickUpper,
    liquidity: raw.liquidity,
    amount0,
    amount1,
    amount0USD,
    amount1USD,
    totalValueUSD,
    uncollectedFees0,
    uncollectedFees1,
    uncollectedFeesUSD,
    collectedFees0: fees0,
    collectedFees1: fees1,
    collectedFeesUSD,
    depositedToken0: dep0,
    depositedToken1: dep1,
    withdrawnToken0: with0,
    withdrawnToken1: with1,
    depositedUSD,
    withdrawnUSD,
    priceLower,
    priceUpper,
    currentPrice,
    inRange,
    rangeProgress,
    metrics,
    createdAtTimestamp,
    ageInDays,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const owner = searchParams.get("owner")?.toLowerCase();
  const chainId = parseInt(searchParams.get("chainId") ?? "1") as ChainId;

  if (!owner || !/^0x[0-9a-f]{40}$/.test(owner)) {
    return NextResponse.json({ error: "Invalid owner address" }, { status: 400 });
  }
  if (![1, 8453, 56].includes(chainId)) {
    return NextResponse.json({ error: "Invalid chainId" }, { status: 400 });
  }

  try {
    const data = await querySubgraph<SubgraphPositionsData>(
      chainId,
      POSITIONS_BY_OWNER_QUERY,
      { owner, first: 200 },
    );

    const positions = (data.positions ?? []).map((p) =>
      transformPosition(p, chainId),
    );

    return NextResponse.json(
      { positions, fetchedAt: Date.now() },
      {
        headers: {
          "Cache-Control": `s-maxage=30, stale-while-revalidate=120`,
        },
      },
    );
  } catch (err: unknown) {
    console.error("[/api/positions]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, positions: [] }, { status: 500 });
  }
}
