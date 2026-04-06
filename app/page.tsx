import type { Metadata } from "next";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { TopPoolsCard } from "@/components/dashboard/top-pools-card";
import { ArrowRight, Telescope, Wallet } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Hero banner */}
      <div className="hero-gradient rounded-xl border border-border p-6">
        <h2 className="text-2xl font-bold text-foreground">
          Uniswap V3 LP Intelligence
        </h2>
        <p className="text-muted-foreground mt-1 text-sm max-w-xl">
          Track fee APR, Pool PnL vs HODL, impermanent loss, and discover the best
          WETH/USDC/WBTC/LST pools across Ethereum, Base, and BNB Chain.
        </p>

        {/* Quick actions */}
        <div className="flex gap-3 mt-4">
          <Link
            href="/discover"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Telescope className="w-4 h-4" />
            Discover Top Pools
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/positions"
            className="flex items-center gap-2 border border-border bg-secondary px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            <Wallet className="w-4 h-4" />
            My Positions
          </Link>
        </div>
      </div>

      {/* Protocol stats */}
      <StatsOverview />

      {/* Top pools table */}
      <TopPoolsCard />
    </div>
  );
}
