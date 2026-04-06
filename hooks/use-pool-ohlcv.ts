"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { OHLCVCandle } from "@/app/api/pool-ohlcv/route";
import type { ChainId } from "@/types";

interface OHLCVResponse {
  candles: OHLCVCandle[];
  fetchedAt: number;
}

export function usePoolOHLCV(
  poolAddress: string | null,
  chainId: ChainId,
  timeframe: "minute" | "hour" | "day" = "hour",
  limit = 48,
) {
  return useQuery<OHLCVCandle[]>({
    queryKey: ["pool-ohlcv", poolAddress, chainId, timeframe, limit],
    queryFn: async () => {
      if (!poolAddress) return [];
      const res = await fetch(
        `/api/pool-ohlcv?address=${poolAddress}&chainId=${chainId}&timeframe=${timeframe}&limit=${limit}`,
      );
      if (!res.ok) throw new Error("Failed to fetch OHLCV");
      const json: OHLCVResponse = await res.json();
      return json.candles ?? [];
    },
    enabled: !!poolAddress,
    staleTime: 55_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}
