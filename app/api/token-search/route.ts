/**
 * API route: GET /api/token-search?q=USDC&chainId=1
 *
 * Searches the Uniswap V3 subgraph for tokens whose symbol or name matches
 * the query string. Returns up to 20 results ordered by TVL descending.
 * When q looks like an address (starts with 0x), searches by address prefix.
 */
import { NextRequest, NextResponse } from "next/server";
import { querySubgraph } from "@/lib/subgraph";
import {
  TOKEN_SEARCH_BY_SYMBOL_QUERY,
  TOKEN_SEARCH_BY_ADDRESS_QUERY,
} from "@/queries/pools";
import type { ChainId } from "@/types";

interface SubgraphToken {
  id: string;
  symbol: string;
  name: string;
  decimals: string;
  totalValueLockedUSD: string;
}

interface TokenSearchData {
  tokens: SubgraphToken[];
}

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

  const isAddress = q.startsWith("0x") && q.length >= 4;

  try {
    const data = await querySubgraph<TokenSearchData>(
      chainId,
      isAddress ? TOKEN_SEARCH_BY_ADDRESS_QUERY : TOKEN_SEARCH_BY_SYMBOL_QUERY,
      isAddress
        ? { id: q.toLowerCase(), first: 10 }
        : { query: q, first: 20 },
    );

    const tokens = (data.tokens ?? []).map((t) => ({
      address: t.id.toLowerCase(),
      symbol: t.symbol,
      name: t.name,
      decimals: parseInt(t.decimals),
      tvlUSD: parseFloat(t.totalValueLockedUSD),
      chainId,
    }));

    return NextResponse.json(
      { tokens },
      { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (err: unknown) {
    console.error("[/api/token-search]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, tokens: [] }, { status: 500 });
  }
}
