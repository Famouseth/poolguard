/**
 * API route: GET /api/pool-positions?address=0x...&chainId=1
 * Returns active Uniswap V3 NFT LP positions for a pool.
 * Each position includes the NFT token ID, owner, amounts, and collected fees.
 * Queries The Graph Studio; returns unavailable:true when endpoint is unreachable.
 */
import { NextRequest, NextResponse } from "next/server";
import { SUBGRAPH_URLS } from "@/lib/constants";
import type { ChainId } from "@/types";

export interface LPPosition {
  nftId: string;       // V3 NFT token ID
  owner: string;       // wallet address
  liquidity: string;
  depositedToken0: number;
  depositedToken1: number;
  withdrawnToken0: number;
  withdrawnToken1: number;
  collectedFeesToken0: number;
  collectedFeesToken1: number;
  txHash: string;      // creation tx
  tickLower: number;
  tickUpper: number;
}

const POSITIONS_QUERY = `
query PoolPositions($pool: String!) {
  positions(
    where: { pool: $pool, liquidity_gt: "0" }
    orderBy: liquidity
    orderDirection: desc
    first: 50
  ) {
    id
    owner
    liquidity
    depositedToken0
    depositedToken1
    withdrawnToken0
    withdrawnToken1
    collectedFeesToken0
    collectedFeesToken1
    transaction { id }
    tickLower { tickIdx }
    tickUpper { tickIdx }
  }
}`;

interface RawPosition {
  id: string;
  owner: string;
  liquidity: string;
  depositedToken0: string;
  depositedToken1: string;
  withdrawnToken0: string;
  withdrawnToken1: string;
  collectedFeesToken0: string;
  collectedFeesToken1: string;
  transaction: { id: string };
  tickLower: { tickIdx: string };
  tickUpper: { tickIdx: string };
}

async function queryGraph<T>(
  url: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.errors?.length) throw new Error(json.errors[0]?.message ?? "GraphQL error");
    return json.data as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const address = searchParams.get("address")?.toLowerCase();
  const chainId = parseInt(searchParams.get("chainId") ?? "1") as ChainId;

  if (!address || !/^0x[0-9a-f]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }
  if (![1, 8453, 56].includes(chainId)) {
    return NextResponse.json({ error: "Invalid chainId" }, { status: 400 });
  }

  try {
    const data = await queryGraph<{ positions: RawPosition[] }>(
      SUBGRAPH_URLS[chainId],
      POSITIONS_QUERY,
      { pool: address },
    );

    const positions: LPPosition[] = (data.positions ?? []).map((p) => ({
      nftId: p.id,
      owner: p.owner,
      liquidity: p.liquidity,
      depositedToken0: parseFloat(p.depositedToken0),
      depositedToken1: parseFloat(p.depositedToken1),
      withdrawnToken0: parseFloat(p.withdrawnToken0),
      withdrawnToken1: parseFloat(p.withdrawnToken1),
      collectedFeesToken0: parseFloat(p.collectedFeesToken0),
      collectedFeesToken1: parseFloat(p.collectedFeesToken1),
      txHash: p.transaction.id,
      tickLower: parseInt(p.tickLower.tickIdx),
      tickUpper: parseInt(p.tickUpper.tickIdx),
    }));

    return NextResponse.json(
      { positions, unavailable: false, fetchedAt: Date.now() },
      { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch {
    return NextResponse.json(
      { positions: [], unavailable: true, fetchedAt: Date.now() },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
