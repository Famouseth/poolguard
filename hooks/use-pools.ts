/**
 * Hook: usePools
 * Fetches and aggregates pool data across all three chains via the /api/pools route.
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store";
import type { Pool, ChainId } from "@/types";

// ─── API response shape ────────────────────────────────────────────────────

interface PoolsApiResponse {
  pools: Pool[];
  fetchedAt: number;
}

// Build the fetch URL for a chain, optionally passing custom token addresses
function poolsUrl(chainId: ChainId, customAddresses: string[]): string {
  const base = `/api/pools?chainId=${chainId}`;
  if (customAddresses.length === 0) return base;
  return `${base}&tokens=${encodeURIComponent(customAddresses.join(","))}`;
}

// ─── Fetch from Next.js API route (one call per chain) ─────────────────────

async function fetchPoolsForChain(chainId: ChainId, customAddresses: string[]): Promise<Pool[]> {
  const url = poolsUrl(chainId, customAddresses);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch pools for chain ${chainId}`);
  const json: PoolsApiResponse = await res.json();
  return json.pools ?? [];
}

async function fetchAllPools(customTokens: { address: string; chainId: ChainId }[]): Promise<Pool[]> {
  // Build per-chain address lists from customTokens
  const byChain = (chainId: ChainId) =>
    customTokens.filter((t) => t.chainId === chainId).map((t) => t.address);

  const [eth, base, bnb] = await Promise.allSettled([
    fetchPoolsForChain(1, byChain(1)),
    fetchPoolsForChain(8453, byChain(8453)),
    fetchPoolsForChain(56, byChain(56)),
  ]);

  const results: Pool[] = [];
  if (eth.status === "fulfilled") results.push(...eth.value);
  if (base.status === "fulfilled") results.push(...base.value);
  if (bnb.status === "fulfilled") results.push(...bnb.value);
  return results;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function usePools() {
  const { filters, customTokens } = useAppStore();

  // Stable cache key that changes when user's custom token selection changes
  const customKey = customTokens
    .map((t) => `${t.chainId}:${t.address}`)
    .sort()
    .join(",");

  const query = useQuery({
    queryKey: ["pools", "all", customKey],
    queryFn: () => fetchAllPools(customTokens),
    staleTime: 55_000,
    gcTime: 5 * 60_000,
    refetchInterval: 60_000,      // auto-poll every 60 s
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Client-side filtering + sorting
  const pools = (query.data ?? []).filter((pool) => {
    if (!filters.chainIds.includes(pool.chainId)) return false;
    if (!filters.feeTiers.includes(pool.feeTier)) return false;
    if (pool.totalValueLockedUSD < filters.minTVL) return false;
    if (filters.minAPR > 0 && (pool.feeAPR ?? 0) < filters.minAPR) return false;
    if (filters.tokenAddresses.length > 0) {
      const hasToken =
        filters.tokenAddresses.includes(pool.token0.address) ||
        filters.tokenAddresses.includes(pool.token1.address);
      if (!hasToken) return false;
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const label = `${pool.token0.symbol}/${pool.token1.symbol} ${pool.id}`.toLowerCase();
      if (!label.includes(q)) return false;
    }
    return true;
  });

  // Sort
  const sorted = [...pools].sort((a, b) => {
    let aVal = 0;
    let bVal = 0;
    switch (filters.sortBy) {
      case "feeAPR":      aVal = a.feeAPR ?? 0;      bVal = b.feeAPR ?? 0;      break;
      case "feeAPR7d":    aVal = a.feeAPR7d ?? 0;    bVal = b.feeAPR7d ?? 0;    break;
      case "tvl":         aVal = a.totalValueLockedUSD; bVal = b.totalValueLockedUSD; break;
      case "volume24h":   aVal = a.volumeUSD24h;      bVal = b.volumeUSD24h;     break;
      case "volumeToTVL": aVal = a.volumeToTVL ?? 0; bVal = b.volumeToTVL ?? 0; break;
    }
    return filters.sortDirection === "desc" ? bVal - aVal : aVal - bVal;
  });

  return {
    pools: sorted,
    allPools: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Single pool ──────────────────────────────────────────────────────────

export function usePool(poolId: string, chainId: ChainId) {
  return useQuery({
    queryKey: ["pool", chainId, poolId],
    queryFn: async () => {
      const res = await fetch(`/api/pools/${encodeURIComponent(poolId)}?chainId=${chainId}`);
      if (!res.ok) throw new Error("Failed to fetch pool detail");
      const json = await res.json();
      return json.pool as Pool | null;
    },
    staleTime: 60_000,
    enabled: !!poolId && !!chainId,
  });
}
