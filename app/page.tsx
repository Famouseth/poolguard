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
      <div className="hero-gradient rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-primary/60 font-mono uppercase tracking-widest">
            // pool intelligence system v3
          </span>
        </div>
        <h2
          className="text-2xl font-bold text-primary uppercase tracking-wide"
          style={{ textShadow: "0 0 12px rgba(0,255,65,0.7), 0 0 30px rgba(0,255,65,0.3)" }}
        >
          Uniswap V3 LP Intelligence
        </h2>
        <p className="text-muted-foreground mt-1.5 text-sm max-w-xl">
          Track fee APR, Pool PnL vs HODL, impermanent loss, and discover the best
          WETH/USDC/WBTC/LST pools across Ethereum, Base, and BNB Chain.
        </p>

        {/* Quick actions */}
        <div className="flex gap-3 mt-5">
          <Link
            href="/discover"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-bold uppercase tracking-wide hover:bg-primary/90 transition-all"
            style={{ boxShadow: "0 0 12px rgba(0,255,65,0.45), 0 0 24px rgba(0,255,65,0.15)" }}
          >
            <Telescope className="w-4 h-4" />
            Discover Pools
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/positions"
            className="flex items-center gap-2 border border-primary/30 bg-secondary/60 px-4 py-2 rounded text-sm font-medium hover:border-primary/60 hover:bg-secondary transition-all text-primary/80"
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
