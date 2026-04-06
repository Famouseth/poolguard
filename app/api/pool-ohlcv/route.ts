/**
 * API route: GET /api/pool-ohlcv?address=0x...&chainId=1&timeframe=hour&limit=48
 * Proxies GeckoTerminal's OHLCV endpoint for charting.
 * timeframe: minute | hour | day
 */
import { NextRequest, NextResponse } from "next/server";
import { GECKO_NETWORK } from "@/lib/geckoterminal";
import type { ChainId } from "@/types";

export interface OHLCVCandle {
  timestamp: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // in USD
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const address = searchParams.get("address")?.toLowerCase();
  const chainId = parseInt(searchParams.get("chainId") ?? "1") as ChainId;
  const timeframe = searchParams.get("timeframe") ?? "hour";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "48"), 1000);

  if (!address || !/^0x[0-9a-f]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid pool address" }, { status: 400 });
  }
  if (![1, 8453, 56].includes(chainId)) {
    return NextResponse.json({ error: "Invalid chainId" }, { status: 400 });
  }
  if (!["minute", "hour", "day"].includes(timeframe)) {
    return NextResponse.json({ error: "Invalid timeframe" }, { status: 400 });
  }

  const network = GECKO_NETWORK[chainId];
  const url = `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${address}/ohlcv/${timeframe}?limit=${limit}&token=base`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json;version=20230302" },
      signal: controller.signal,
      next: { revalidate: 60 },
    });
    clearTimeout(timer);

    if (res.status === 429) {
      return NextResponse.json({ candles: [], fetchedAt: Date.now() });
    }
    if (!res.ok) {
      return NextResponse.json({ error: `GeckoTerminal ${res.status}`, candles: [] }, { status: 502 });
    }

    const json: { data?: { attributes?: { ohlcv_list?: number[][] } } } = await res.json();
    const raw = json.data?.attributes?.ohlcv_list ?? [];

    // GeckoTerminal returns [timestamp_ms, open, high, low, close, volume]
    const candles: OHLCVCandle[] = raw.map(([ts, o, h, l, c, v]): OHLCVCandle => ({
      timestamp: ts,
      open: o,
      high: h,
      low: l,
      close: c,
      volume: v,
    }));

    // Ensure ascending order
    candles.sort((a, b) => a.timestamp - b.timestamp);

    return NextResponse.json(
      { candles, fetchedAt: Date.now() },
      { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (err: unknown) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, candles: [] }, { status: 500 });
  }
}
