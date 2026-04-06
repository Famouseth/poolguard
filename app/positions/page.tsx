"use client";

import { Wallet, TrendingUp, DollarSign, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletInput } from "@/components/positions/wallet-connect";
import { PositionCard } from "@/components/positions/position-card";
import { usePositions } from "@/hooks/use-positions";
import { formatUSD } from "@/lib/utils";

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  colour,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  colour: string;
}) {
  return (
    <Card className="glass">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold tabular-nums mt-0.5">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-secondary ${colour}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PositionsPage() {
  const { positions, summary, isLoading, hasOwner, error } = usePositions();

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          My Positions
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Track Uniswap V3 LP positions across Ethereum, Base, and BNB Chain.
          Full Revert-style metrics: Pool PnL, Fee APR, Divergence PnL, IL.
        </p>
      </div>

      {/* Wallet input */}
      <WalletInput />

      {/* Summary stats */}
      {hasOwner && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="Total Value"
            value={isLoading ? "…" : formatUSD(summary.totalValueUSD, true)}
            icon={DollarSign}
            colour="text-primary"
            sub={`${summary.totalPositions} position${summary.totalPositions !== 1 ? "s" : ""}`}
          />
          <SummaryCard
            label="Total Fees"
            value={isLoading ? "…" : formatUSD(summary.totalFeesUSD, true)}
            icon={TrendingUp}
            colour="text-profit"
          />
          <SummaryCard
            label="Pool PnL"
            value={isLoading ? "…" : formatUSD(summary.poolPnLUSD, true)}
            icon={TrendingUp}
            colour={summary.poolPnLUSD >= 0 ? "text-profit" : "text-loss"}
          />
          <SummaryCard
            label="In Range"
            value={isLoading ? "…" : `${summary.inRangeCount}/${summary.totalPositions}`}
            icon={Target}
            colour="text-cyan-400"
            sub={`${summary.outOfRangeCount} out of range`}
          />
        </div>
      )}

      {/* Empty / loading / positions list */}
      {!hasOwner && (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <Wallet className="w-10 h-10" />
          <p className="text-sm">Connect your wallet or paste an address to track positions.</p>
        </div>
      )}

      {hasOwner && isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )}

      {hasOwner && !isLoading && error && (
        <div className="rounded-lg border border-loss/30 bg-loss/10 text-loss p-4 text-sm">
          Failed to load positions: {String(error)}
        </div>
      )}

      {hasOwner && !isLoading && !error && positions.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <Target className="w-10 h-10" />
          <p className="text-sm">No active positions found for this address.</p>
          <p className="text-xs">Only preferred token pairs are shown (WETH/USDC/WBTC/LSTs).</p>
        </div>
      )}

      {!isLoading && positions.map((pos) => (
        <PositionCard key={`${pos.chainId}-${pos.id}`} position={pos} />
      ))}
    </div>
  );
}
