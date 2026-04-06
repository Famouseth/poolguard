/**
 * PoolFilters — filter bar for the Discover page.
 * Controls chain, fee tier, token, TVL floor, APR floor, and search.
 */
"use client";

import { useAppStore } from "@/store";
import {
  SUPPORTED_CHAINS,
  FEE_TIERS,
  FEE_TIER_LABELS,
  CHAIN_SHORT,
  CHAIN_COLORS,
} from "@/lib/constants";
import type { ChainId } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { TokenPicker } from "./token-picker";

const MIN_TVL_OPTIONS = [
  { label: "Any",   value: 0 },
  { label: "$10K",  value: 10_000 },
  { label: "$50K",  value: 50_000 },
  { label: "$100K", value: 100_000 },
  { label: "$500K", value: 500_000 },
  { label: "$1M",   value: 1_000_000 },
];

const MIN_APR_OPTIONS = [
  { label: "Any",  value: 0 },
  { label: "5%",   value: 5 },
  { label: "10%",  value: 10 },
  { label: "20%",  value: 20 },
  { label: "50%",  value: 50 },
  { label: "100%", value: 100 },
];

export function PoolFilters() {
  const { filters, setFilters, resetFilters } = useAppStore();

  function toggleChain(chainId: ChainId) {
    const current = filters.chainIds;
    const next = current.includes(chainId)
      ? current.filter((c) => c !== chainId)
      : [...current, chainId];
    // Always keep at least one chain
    if (next.length > 0) setFilters({ chainIds: next });
  }

  function toggleFeeTier(tier: number) {
    const current = filters.feeTiers;
    const next = current.includes(tier)
      ? current.filter((t) => t !== tier)
      : [...current, tier];
    if (next.length > 0) setFilters({ feeTiers: next });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </div>
        <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs gap-1">
          <RotateCcw className="w-3 h-3" />
          Reset
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search pool, token…"
          className="pl-8 h-8 text-xs"
          value={filters.searchQuery}
          onChange={(e) => setFilters({ searchQuery: e.target.value })}
        />
      </div>

      {/* Token picker — search any token and fetch only its pools */}
      <div className="border-t border-border pt-3">
        <TokenPicker />
      </div>

      {/* Chains */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-medium">
          Chain
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {SUPPORTED_CHAINS.map((chainId) => {
            const active = filters.chainIds.includes(chainId);
            return (
              <button
                key={chainId}
                onClick={() => toggleChain(chainId)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                  active
                    ? "border-transparent text-white"
                    : "border-border text-muted-foreground hover:border-border/80",
                )}
                style={
                  active
                    ? { backgroundColor: CHAIN_COLORS[chainId] }
                    : undefined
                }
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: active ? "white" : CHAIN_COLORS[chainId] }}
                />
                {CHAIN_SHORT[chainId]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fee tiers */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-medium">
          Fee Tier
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {FEE_TIERS.map((tier) => {
            const active = filters.feeTiers.includes(tier);
            return (
              <button
                key={tier}
                onClick={() => toggleFeeTier(tier)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {FEE_TIER_LABELS[tier]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Min TVL */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-medium">
          Min TVL
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {MIN_TVL_OPTIONS.map(({ label, value }) => {
            const active = filters.minTVL === value;
            return (
              <button
                key={value}
                onClick={() => setFilters({ minTVL: value })}
                className={cn(
                  "py-1 rounded text-xs font-medium border transition-all",
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Min APR */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-medium">
          Min Fee APR
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {MIN_APR_OPTIONS.map(({ label, value }) => {
            const active = filters.minAPR === value;
            return (
              <button
                key={value}
                onClick={() => setFilters({ minAPR: value })}
                className={cn(
                  "py-1 rounded text-xs font-medium border transition-all",
                  active
                    ? "border-profit bg-profit/10 text-profit"
                    : "border-border text-muted-foreground hover:border-profit/40",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
