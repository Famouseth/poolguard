/**
 * API route: GET /api/pool-trades?address=0x...&chainId=1
 * Proxies GeckoTerminal's recent trades endpoint for a single pool.
 * Returns up to ~100 most recent swaps with buy/sell direction, amounts, USD value.
 */
import { NextRequest, NextResponse } from "next/server";
import { GECKO_NETWORK } from "@/lib/geckoterminal";
import type { ChainId } from "@/types";

export interface PoolTrade {
  txHash: string;
  walletAddress: string;
  kind: "buy" | "sell";
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: number;
  toAmount: number;
  priceFromUSD: number;
  priceToUSD: number;
  volumeUSD: number;
  timestamp: string; // ISO string
}

interface GeckoTradeAttr {
  block_number: number;
  tx_hash: string;
  tx_from_address: string;
  from_token_amount: string;
  to_token_amount: string;
  price_from_in_currency_token: string;
  price_to_in_currency_token: string;
  price_from_in_usd: string;
  price_to_in_usd: string;
  block_timestamp: string;
  kind: "buy" | "sell";
  volume_in_usd: string;
  from_token_address: string;
  to_token_address: string;
}

interface GeckoTradeItem {
  id: string;
  type: string;
  attributes: GeckoTradeAttr;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const address = searchParams.get("address")?.toLowerCase();
  const chainId = parseInt(searchParams.get("chainId") ?? "1") as ChainId;

  if (!address || !/^0x[0-9a-f]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid pool address" }, { status: 400 });
  }
  if (![1, 8453, 56].includes(chainId)) {
    return NextResponse.json({ error: "Invalid chainId" }, { status: 400 });
  }

  const network = GECKO_NETWORK[chainId];
  const url = `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${address}/trades`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json;version=20230302" },
      signal: controller.signal,
      next: { revalidate: 15 },
    });
    clearTimeout(timer);

    if (res.status === 429) {
      return NextResponse.json({ trades: [], fetchedAt: Date.now() });
    }
    if (!res.ok) {
      return NextResponse.json({ error: `GeckoTerminal ${res.status}`, trades: [] }, { status: 502 });
    }

    const json: { data: GeckoTradeItem[] } = await res.json();

    const trades: PoolTrade[] = (json.data ?? []).map((item): PoolTrade => {
      const a = item.attributes;
      return {
        txHash: a.tx_hash,
        walletAddress: a.tx_from_address,
        kind: a.kind,
        fromTokenAddress: a.from_token_address,
        toTokenAddress: a.to_token_address,
        fromAmount: parseFloat(a.from_token_amount),
        toAmount: parseFloat(a.to_token_amount),
        priceFromUSD: parseFloat(a.price_from_in_usd),
        priceToUSD: parseFloat(a.price_to_in_usd),
        volumeUSD: parseFloat(a.volume_in_usd),
        timestamp: a.block_timestamp,
      };
    });

    return NextResponse.json(
      { trades, fetchedAt: Date.now() },
      { headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=30" } },
    );
  } catch (err: unknown) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, trades: [] }, { status: 500 });
  }
}
