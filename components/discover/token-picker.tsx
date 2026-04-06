/**
 * TokenPicker — lets users search for any token by symbol or address,
 * then add it to the pool filter so all pools containing that token are fetched.
 *
 * Uses /api/token-search with a 400 ms debounce. Persists selections in Zustand.
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store";
import {
  SUPPORTED_CHAINS,
  CHAIN_SHORT,
  CHAIN_COLORS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatUSD } from "@/lib/utils";
import type { ChainId, TokenInfo } from "@/types";

interface SearchToken extends TokenInfo {
  chainId: ChainId;
  tvlUSD: number;
}

interface TokenSearchResponse {
  tokens: SearchToken[];
}

// ─── Component ─────────────────────────────────────────────────────────────

export function TokenPicker() {
  const { filters, customTokens, addCustomToken, removeCustomToken, clearCustomTokens } =
    useAppStore();

  const [query, setQuery] = useState("");
  const [searchChain, setSearchChain] = useState<ChainId>(
    filters.chainIds[0] ?? 1,
  );
  const [results, setResults] = useState<SearchToken[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep searchChain in sync if user changes chain filter
  useEffect(() => {
    if (!filters.chainIds.includes(searchChain)) {
      setSearchChain(filters.chainIds[0] ?? 1);
    }
  }, [filters.chainIds, searchChain]);

  // Debounced token search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/token-search?q=${encodeURIComponent(query)}&chainId=${searchChain}`,
        );
        if (!res.ok) throw new Error("search failed");
        const data: TokenSearchResponse = await res.json();
        setResults(data.tokens ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, searchChain]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleAdd(token: SearchToken) {
    addCustomToken({ ...token, chainId: searchChain });
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  const isAdded = (address: string, chainId: ChainId) =>
    customTokens.some((t) => t.address === address && t.chainId === chainId);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
          Tokens &amp; Pools
        </p>
        {customTokens.length > 0 && (
          <button
            onClick={clearCustomTokens}
            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Selected token chips */}
      {customTokens.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {customTokens.map((t) => (
            <span
              key={`${t.chainId}:${t.address}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/30"
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: CHAIN_COLORS[t.chainId] }}
              />
              {t.symbol}
              <button
                onClick={() => removeCustomToken(t.address, t.chainId)}
                className="ml-0.5 text-primary/60 hover:text-primary transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Chain selector for search scope */}
      <div className="flex gap-1 mb-2">
        {SUPPORTED_CHAINS.filter((c) => filters.chainIds.includes(c)).map((chainId) => (
          <button
            key={chainId}
            onClick={() => setSearchChain(chainId)}
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-medium border transition-all",
              searchChain === chainId
                ? "border-transparent text-white"
                : "border-border text-muted-foreground hover:border-border/80",
            )}
            style={
              searchChain === chainId
                ? { backgroundColor: CHAIN_COLORS[chainId] }
                : undefined
            }
          >
            {CHAIN_SHORT[chainId]}
          </button>
        ))}
      </div>

      {/* Search input + dropdown */}
      <div ref={containerRef} className="relative">
        <div className="relative">
          {isSearching ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          )}
          <Input
            placeholder="Symbol or 0x address…"
            className="pl-8 h-8 text-xs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
          />
        </div>

        {open && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg overflow-hidden">
            <div className="max-h-52 overflow-y-auto">
              {results.map((token) => {
                const added = isAdded(token.address, searchChain);
                return (
                  <button
                    key={token.address}
                    onClick={() => !added && handleAdd({ ...token, chainId: searchChain })}
                    disabled={added}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-secondary transition-colors text-left",
                      added && "opacity-50 cursor-default",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ backgroundColor: CHAIN_COLORS[searchChain] }}
                      >
                        {token.symbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">{token.symbol}</div>
                        <div className="text-muted-foreground truncate text-[10px]">{token.name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {token.tvlUSD > 0 && (
                        <span className="text-muted-foreground text-[10px]">
                          {formatUSD(token.tvlUSD, true)} TVL
                        </span>
                      )}
                      {added ? (
                        <span className="text-profit text-[10px]">Added</span>
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-primary" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {open && results.length === 0 && !isSearching && query.length >= 2 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover px-3 py-2 text-xs text-muted-foreground">
            No tokens found for &ldquo;{query}&rdquo; on {CHAIN_SHORT[searchChain]}
          </div>
        )}
      </div>

      {customTokens.length === 0 && (
        <p className="text-[10px] text-muted-foreground/60 mt-1.5">
          Add tokens to only show pools containing them.
        </p>
      )}
    </div>
  );
}
