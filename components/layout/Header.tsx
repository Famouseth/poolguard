"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

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
  const title = PAGE_TITLES[pathname] ?? "PoolGuard";

  function handleRefresh() {
    qc.invalidateQueries();
  }

  return (
    <header className="h-16 border-b border-border px-6 flex items-center justify-between bg-background/80 backdrop-blur-sm sticky top-0 z-20">
      <h1 className="text-base font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Global refresh */}
        <button
          onClick={handleRefresh}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Refresh all data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Wallet connect */}
        <ConnectButton
          accountStatus="avatar"
          chainStatus="icon"
          showBalance={false}
        />
      </div>
    </header>
  );
}
