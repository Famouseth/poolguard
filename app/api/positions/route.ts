/**
 * API route: GET /api/positions?owner=0x...&chainId=1
 *
 * Position tracking requires The Graph hosted service, which was shut down.
 * This route returns an informational response until a self-hosted subgraph
 * or on-chain SDK integration is available.
 */
import { NextRequest, NextResponse } from "next/server";
import type { ChainId } from "@/types";

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

  return NextResponse.json(
    {
      positions: [],
      unavailable: true,
      message: "Position tracking is temporarily unavailable. The Graph hosted service was shut down and a self-hosted subgraph or Uniswap SDK integration is required to retrieve wallet positions.",
      fetchedAt: Date.now(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
