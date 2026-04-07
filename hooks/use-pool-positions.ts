"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { LPPosition } from "@/app/api/pool-positions/route";
import type { ChainId } from "@/types";

interface PositionsResponse {
  positions: LPPosition[];
  unavailable: boolean;
  fetchedAt: number;
}

export function usePoolPositions(poolAddress: string | null, chainId: ChainId) {
  return useQuery<PositionsResponse>({
    queryKey: ["pool-positions", poolAddress, chainId],
    queryFn: async () => {
      if (!poolAddress) return { positions: [], unavailable: false, fetchedAt: Date.now() };
      const res = await fetch(`/api/pool-positions?address=${poolAddress}&chainId=${chainId}`);
      if (!res.ok) throw new Error("Failed to fetch LP positions");
      return res.json() as Promise<PositionsResponse>;
    },
    enabled: !!poolAddress,
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}
