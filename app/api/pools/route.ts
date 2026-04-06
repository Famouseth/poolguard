/**
 * API route: GET /api/pools?chainId=1[&tokens=0xabc,0xdef]
 *
 * Fetches top Uniswap V3 pools for the given chain via GeckoTerminal's free API.
 * Optional `tokens` param (comma-separated addresses) restricts results to pools
 * containing those specific tokens.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUniswapPools } from "@/lib/geckoterminal";
import { MIN_POOL_TVL_USD } from "@/lib/constants";
import type { ChainId } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const chainId = parseInt(searchParams.get("chainId") ?? "1") as ChainId;

  if (![1, 8453, 56].includes(chainId)) {
    return NextResponse.json({ error: "Invalid chainId" }, { status: 400 });
  }

  // Optional custom token addresses from the TokenPicker
  const tokensParam = searchParams.get("tokens");
  const customAddresses = tokensParam
    ? tokensParam.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean)
    : undefined;

  try {
    let pools = await getUniswapPools(chainId, customAddresses);

    // Apply minimum TVL floor
    pools = pools.filter((p) => p.totalValueLockedUSD >= MIN_POOL_TVL_USD);

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
