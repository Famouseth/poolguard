/**
 * API route: GET /api/pool-events?address=0x...&chainId=1
 * Returns Mint (Add LP) and Burn (Remove LP) events for a Uniswap V3 pool.
 * Queries The Graph Studio; returns unavailable:true with graceful fallback
 * when the subgraph endpoint is unreachable (e.g. Ethereum hosted service shutdown).
 */
import { NextRequest, NextResponse } from "next/server";
import { SUBGRAPH_URLS } from "@/lib/constants";
import type { ChainId } from "@/types";

export interface PoolEvent {
  id: string;
  kind: "mint" | "burn";
  txHash: string;
  owner: string;
  amount0: number;
  amount1: number;
  amountUSD: number;
  timestamp: number; // unix seconds
}

const EVENTS_QUERY = `
query PoolEvents($pool: String!) {
  mints(where: { pool: $pool }, orderBy: timestamp, orderDirection: desc, first: 25) {
    id
    transaction { id }
    timestamp
    owner
    origin
    amount0
    amount1
    amountUSD
  }
  burns(where: { pool: $pool }, orderBy: timestamp, orderDirection: desc, first: 25) {
    id
    transaction { id }
    timestamp
    owner
    origin
    amount0
    amount1
    amountUSD
  }
}`;

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

interface RawMint {
  id: string;
  transaction: { id: string };
  timestamp: string;
  owner: string;
  origin: string;
  amount0: string;
  amount1: string;
  amountUSD: string;
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
    const data = await queryGraph<{ mints: RawMint[]; burns: RawMint[] }>(
      SUBGRAPH_URLS[chainId],
      EVENTS_QUERY,
      { pool: address },
    );

    const events: PoolEvent[] = [
      ...(data.mints ?? []).map((m): PoolEvent => ({
        id: m.id,
        kind: "mint",
        txHash: m.transaction.id,
        owner: m.origin ?? m.owner,
        amount0: parseFloat(m.amount0),
        amount1: parseFloat(m.amount1),
        amountUSD: parseFloat(m.amountUSD),
        timestamp: parseInt(m.timestamp),
      })),
      ...(data.burns ?? []).map((b): PoolEvent => ({
        id: b.id,
        kind: "burn",
        txHash: b.transaction.id,
        owner: b.origin ?? b.owner,
        amount0: parseFloat(b.amount0),
        amount1: parseFloat(b.amount1),
        amountUSD: parseFloat(b.amountUSD),
        timestamp: parseInt(b.timestamp),
      })),
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);

    return NextResponse.json(
      { events, unavailable: false, fetchedAt: Date.now() },
      { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch {
    return NextResponse.json(
      { events: [], unavailable: true, fetchedAt: Date.now() },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
