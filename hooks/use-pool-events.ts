"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { PoolEvent } from "@/app/api/pool-events/route";
import type { ChainId } from "@/types";

interface EventsResponse {
  events: PoolEvent[];
  unavailable: boolean;
  fetchedAt: number;
}

export function usePoolEvents(poolAddress: string | null, chainId: ChainId) {
  return useQuery<EventsResponse>({
    queryKey: ["pool-events", poolAddress, chainId],
    queryFn: async () => {
      if (!poolAddress) return { events: [], unavailable: false, fetchedAt: Date.now() };
      const res = await fetch(`/api/pool-events?address=${poolAddress}&chainId=${chainId}`);
      if (!res.ok) throw new Error("Failed to fetch pool events");
      return res.json() as Promise<EventsResponse>;
    },
    enabled: !!poolAddress,
    staleTime: 30_000,
    refetchInterval: 45_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}
