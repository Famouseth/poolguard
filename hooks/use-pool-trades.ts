"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { PoolTrade } from "@/app/api/pool-trades/route";
import type { ChainId } from "@/types";

interface TradesResponse {
  trades: PoolTrade[];
  fetchedAt: number;
}

export function usePoolTrades(poolAddress: string | null, chainId: ChainId) {
  return useQuery<PoolTrade[]>({
    queryKey: ["pool-trades", poolAddress, chainId],
    queryFn: async () => {
      if (!poolAddress) return [];
      const res = await fetch(`/api/pool-trades?address=${poolAddress}&chainId=${chainId}`);
      if (!res.ok) throw new Error("Failed to fetch trades");
      const json: TradesResponse = await res.json();
      return json.trades ?? [];
    },
    enabled: !!poolAddress,
    staleTime: 20_000,
    refetchInterval: 20_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}
