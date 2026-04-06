import type { Metadata } from "next";
import { PoolDiscoveryTable } from "@/components/discover/pool-discovery-table";
import { PoolFilters } from "@/components/discover/pool-filters";
import { Telescope } from "lucide-react";

export const metadata: Metadata = { title: "Discover Top Pools" };

export default function DiscoverPage() {
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Telescope className="w-5 h-5 text-primary" />
          Discover Top Pools
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Live scanner of the best Uniswap V3 pools for WETH, USDC, WBTC, LSTs and stablecoins
          across Ethereum, Base and BNB. Sorted by Fee APR by default.
        </p>
      </div>

      {/* Layout: filters sidebar + table */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Filters (left panel on desktop) */}
        <div className="lg:w-56 shrink-0">
          <PoolFilters />
        </div>

        {/* Main table */}
        <div className="flex-1 min-w-0">
          <PoolDiscoveryTable />
        </div>
      </div>
    </div>
  );
}
