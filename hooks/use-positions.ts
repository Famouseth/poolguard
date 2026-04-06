/**
 * Hook: usePositions
 * Fetches Uniswap V3 positions for a given owner across all three chains.
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useAppStore } from "@/store";
import type { Position, ChainId } from "@/types";

interface PositionsApiResponse {
  positions: Position[];
  fetchedAt: number;
}

async function fetchPositionsForChain(
  owner: string,
  chainId: ChainId,
): Promise<Position[]> {
  const res = await fetch(
    `/api/positions?owner=${owner.toLowerCase()}&chainId=${chainId}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch positions for chain ${chainId}`);
  const json: PositionsApiResponse = await res.json();
  return json.positions ?? [];
}

export function usePositions() {
  const { address: connectedAddress } = useAccount();
  const { overrideAddress } = useAppStore();

  // Use override address (manually pasted) or connected wallet
  const owner = overrideAddress ?? connectedAddress ?? null;

  const query = useQuery({
    queryKey: ["positions", owner],
    queryFn: async () => {
      if (!owner) return [];
      const [eth, base, bnb] = await Promise.allSettled([
        fetchPositionsForChain(owner, 1),
        fetchPositionsForChain(owner, 8453),
        fetchPositionsForChain(owner, 56),
      ]);
      const results: Position[] = [];
      if (eth.status === "fulfilled") results.push(...eth.value);
      if (base.status === "fulfilled") results.push(...base.value);
      if (bnb.status === "fulfilled") results.push(...bnb.value);
      return results;
    },
    enabled: !!owner,
    staleTime: 25_000,
    gcTime: 5 * 60_000,
    refetchInterval: 30_000,     // auto-poll every 30 s while page is open
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const positions = query.data ?? [];

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
    owner,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    hasOwner: !!owner,
  };
}
