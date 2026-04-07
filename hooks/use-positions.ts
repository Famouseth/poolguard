/**
 * Hook: usePositions
 * Fetches Uniswap V3 positions for a given owner across all three chains.
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store";
import type { Position, ChainId } from "@/types";

interface PositionsApiResponse {
  positions: Position[];
  unavailable?: boolean;
  fetchedAt: number;
}

async function fetchPositionsForChain(
  owner: string,
  chainId: ChainId,
): Promise<{ positions: Position[]; unavailable: boolean }> {
  const res = await fetch(
    `/api/positions?owner=${owner.toLowerCase()}&chainId=${chainId}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch positions for chain ${chainId}`);
  const json: PositionsApiResponse = await res.json();
  return { positions: json.positions ?? [], unavailable: !!json.unavailable };
}

export function usePositions() {
  const { overrideAddress } = useAppStore();

  const owner = overrideAddress ?? null;

  const query = useQuery({
    queryKey: ["positions", owner],
    queryFn: async () => {
      if (!owner) return { positions: [], unavailable: false };
      const [eth, base, bnb] = await Promise.allSettled([
        fetchPositionsForChain(owner, 1),
        fetchPositionsForChain(owner, 8453),
        fetchPositionsForChain(owner, 56),
      ]);
      const results: Position[] = [];
      let unavailable = false;
      if (eth.status === "fulfilled") { results.push(...eth.value.positions); unavailable = unavailable || eth.value.unavailable; }
      if (base.status === "fulfilled") { results.push(...base.value.positions); unavailable = unavailable || base.value.unavailable; }
      if (bnb.status === "fulfilled") { results.push(...bnb.value.positions); unavailable = unavailable || bnb.value.unavailable; }
      return { positions: results, unavailable };
    },
    enabled: !!owner,
    staleTime: 25_000,
    gcTime: 5 * 60_000,
    refetchInterval: 30_000,     // auto-poll every 30 s while page is open
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const positions = query.data?.positions ?? [];
  const unavailable = query.data?.unavailable ?? false;

  // Aggregated summary stats
  const summary = {
    totalValueUSD: positions.reduce((s, p) => s + p.totalValueUSD, 0),
    totalFeesUSD: positions.reduce(
      (s, p) => s + p.uncollectedFeesUSD + p.collectedFeesUSD,
      0,
    ),
    totalPositions: positions.length,
    inRangeCount: positions.filter((p) => p.inRange).length,
    outOfRangeCount: positions.filter((p) => !p.inRange).length,
    poolPnLUSD: positions.reduce((s, p) => s + (p.metrics?.poolPnLUSD ?? 0), 0),
  };

  return {
    positions,
    summary,
    unavailable,
    owner,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    hasOwner: !!owner,
  };
}
