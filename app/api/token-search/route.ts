/**
 * API route: GET /api/token-search?q=USDC&chainId=1
 *
 * Searches for tokens by symbol, name, or address prefix using GeckoTerminal.
 * Returns tokens that appear in Uniswap V3 pools on the specified chain.
 */
import { NextRequest, NextResponse } from "next/server";
import { searchTokens } from "@/lib/geckoterminal";
import type { ChainId } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = (searchParams.get("q") ?? "").trim();
  const chainId = parseInt(searchParams.get("chainId") ?? "1") as ChainId;

  if (!q || q.length < 2) {
    return NextResponse.json({ tokens: [] });
  }

  if (![1, 8453, 56].includes(chainId)) {
    return NextResponse.json({ error: "Invalid chainId" }, { status: 400 });
  }

  try {
    const tokens = await searchTokens(q, chainId);
    return NextResponse.json(
      { tokens },
      { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (err: unknown) {
    console.error("[/api/token-search]", err);
    return NextResponse.json({ error: "Search failed", tokens: [] }, { status: 500 });
  }
}

