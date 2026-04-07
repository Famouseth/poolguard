"use client";

import { RefreshCw } from "lucide-react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/":          "Dashboard",
  "/positions": "My Positions",
  "/discover":  "Discover Top Pools",
  "/explorer":  "Pool Explorer",
  "/alerts":    "Alerts & Watchlist",
};

export function Header() {
  const pathname = usePathname();
  const qc = useQueryClient();
  const fetching = useIsFetching();
  const title = PAGE_TITLES[pathname] ?? "PoolGuard";

  // Track the most recent successful data update across all queries
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const cache = qc.getQueryCache();
    // Subscribe to cache events to capture last-success time
    const unsub = cache.subscribe(() => {
      const max = cache
        .getAll()
        .reduce((m, q) => Math.max(m, q.state.dataUpdatedAt ?? 0), 0);
      if (max > 0) setLastUpdated(max);
    });
    return unsub;
  }, [qc]);

  // Tick every second so "X ago" label stays current
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const secondsAgo = lastUpdated ? Math.floor((now - lastUpdated) / 1000) : null;
  const updatedLabel =
    secondsAgo === null ? null :
    secondsAgo < 10     ? "just now" :
    secondsAgo < 60     ? `${secondsAgo}s ago` :
                          `${Math.floor(secondsAgo / 60)}m ago`;

  function handleRefresh() {
    qc.invalidateQueries();
  }

  return (
    <header
      className="h-16 border-b border-border px-6 flex items-center justify-between bg-background/90 backdrop-blur-sm sticky top-0 z-20"
      style={{ boxShadow: "0 1px 0 rgba(0,255,65,0.12)" }}
    >      <h1
        className="text-base font-bold text-primary uppercase tracking-widest"
        style={{ textShadow: "0 0 8px rgba(0,255,65,0.6)" }}
      >
        {title}
      </h1>

      <div className="flex items-center gap-3">
        {/* Live data indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              fetching > 0
                ? "bg-primary animate-pulse"
                : "bg-primary",
            )}
            style={{
              boxShadow: fetching > 0
                ? "0 0 6px #00ff41, 0 0 12px rgba(0,255,65,0.5)"
                : "0 0 4px rgba(0,255,65,0.4)",
            }}
          />
          {fetching > 0 ? (
            <span className="text-profit font-medium">updating…</span>
          ) : updatedLabel ? (
            <span className="text-muted-foreground">Updated {updatedLabel}</span>
          ) : (
            <span className="text-profit/80 font-medium">Live</span>
          )}
        </div>

        {/* Manual refresh — spins while fetching */}
        <button
          onClick={handleRefresh}
          disabled={fetching > 0}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
          title="Refresh all data"
        >
          <RefreshCw className={cn("w-4 h-4", fetching > 0 && "animate-spin")} />
        </button>
      </div>
    </header>
  );
}
