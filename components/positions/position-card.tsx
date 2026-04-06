/**
 * PositionCard — full Revert.finance-style position card.
 * Shows value, fees, PnL metrics, APR, range chart, and quick actions.
 */
"use client";

import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricTooltip, METRIC_TOOLTIPS } from "@/components/ui/metric-tooltip";
import { TokenPair } from "@/components/shared/token-pair";
import { ChainBadge } from "@/components/shared/chain-badge";
import { FeeTierBadge } from "@/components/shared/fee-tier-badge";
import { PriceRangeChart } from "./price-range-chart";
import { SimulatorModal } from "@/components/discover/simulator-modal";
import { healthLabel } from "@/lib/calculations";
import { formatUSD, formatPct, formatToken, formatDate, pnlClass, aprClass } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Position } from "@/types";
import { CHAIN_SHORT } from "@/lib/constants";

interface PositionCardProps {
  position: Position;
}

export function PositionCard({ position }: PositionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [simOpen, setSimOpen] = useState(false);

  const { metrics, pool } = position;
  const m = metrics;

  const health = m ? healthLabel(m.healthScore) : null;

  const revertUrl = `https://revert.finance/#/account/${position.owner}?chain=${
    position.chainId === 1 ? "mainnet" : position.chainId === 8453 ? "base" : "bsc"
  }`;

  const uniUrl = `https://app.uniswap.org/positions/v3/${CHAIN_SHORT[position.chainId].toLowerCase()}/${position.id}`;

  return (
    <>
      <Card className={cn("glass transition-all", !position.inRange && "border-muted/50")}>
        <CardContent className="p-4">
          {/* ── Header row ───────────────────────────────────────────────── */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <TokenPair
                token0={pool.token0}
                token1={pool.token1}
                size="md"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                <FeeTierBadge feeTier={pool.feeTier} />
                <ChainBadge chainId={position.chainId} />
                <Badge variant={position.inRange ? "profit" : "secondary"}>
                  {position.inRange ? "● In Range" : "○ Out of Range"}
                </Badge>
                {health && (
                  <span className={cn("text-xs font-semibold", health.color)}>
                    Health: {m?.healthScore}/100
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                #{position.id} · {Math.floor(position.ageInDays)}d old
              </span>
            </div>
          </div>

          {/* ── Key metrics row ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
            <MetricTooltip
              label="Position Value"
              description="Current USD value of all tokens in the position."
            >
              <span className="text-foreground text-base font-bold">
                {formatUSD(position.totalValueUSD)}
              </span>
            </MetricTooltip>

            <MetricTooltip
              label="Uncollected Fees"
              description="Fees earned but not yet claimed from the NonfungiblePositionManager."
            >
              <span className="text-profit tabular-nums">
                {formatUSD(position.uncollectedFeesUSD)}
              </span>
            </MetricTooltip>

            <MetricTooltip label="Fee APR" description={METRIC_TOOLTIPS.feeAPR}>
              <span className={cn("tabular-nums", aprClass(m?.feeAPR ?? 0))}>
                {formatPct(m?.feeAPR ?? 0, 1)}
              </span>
            </MetricTooltip>

            <MetricTooltip label="ROI" description={METRIC_TOOLTIPS.roi}>
              <span className={cn("tabular-nums", pnlClass(m?.roi ?? 0))}>
                {formatPct(m?.roi ?? 0, 2)}
              </span>
            </MetricTooltip>
          </div>

          {/* ── PnL metrics row ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3 pt-3 border-t border-border">
            <MetricTooltip label="Pool PnL" description={METRIC_TOOLTIPS.poolPnL}>
              <span className={cn("tabular-nums text-sm font-semibold", pnlClass(m?.poolPnLUSD ?? 0))}>
                {formatUSD(m?.poolPnLUSD ?? 0)}
                <span className="text-xs font-normal ml-1">
                  ({formatPct(m?.poolPnLPct ?? 0, 1)})
                </span>
              </span>
            </MetricTooltip>

            <MetricTooltip label="HODL PnL" description={METRIC_TOOLTIPS.hodlPnL}>
              <span className={cn("tabular-nums text-sm", pnlClass(m?.hodlPnLUSD ?? 0))}>
                {formatUSD(m?.hodlPnLUSD ?? 0)}
                <span className="text-xs ml-1">
                  ({formatPct(m?.hodlPnLPct ?? 0, 1)})
                </span>
              </span>
            </MetricTooltip>

            <MetricTooltip
              label="Divergence PnL"
              description={METRIC_TOOLTIPS.divergencePnL}
            >
              <span className={cn("tabular-nums text-sm", pnlClass(m?.divergencePnLUSD ?? 0))}>
                {formatUSD(m?.divergencePnLUSD ?? 0)}
                <span className="text-xs ml-1">
                  ({formatPct(m?.divergencePnLPct ?? 0, 1)})
                </span>
              </span>
            </MetricTooltip>
          </div>

          {/* ── Toggle expanded ───────────────────────────────────────────── */}
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-3 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Hide details" : "Show details & range chart"}
          </button>

          {/* ── Expanded section ─────────────────────────────────────────── */}
          {expanded && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              {/* Asset breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                    Assets in Position
                  </p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{pool.token0.symbol}</span>
                      <span className="tabular-nums">
                        {formatToken(position.amount0)} (
                        {formatUSD(position.amount0USD)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{pool.token1.symbol}</span>
                      <span className="tabular-nums">
                        {formatToken(position.amount1)} (
                        {formatUSD(position.amount1USD)})
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                    Fees Summary
                  </p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Collected</span>
                      <span className="text-profit tabular-nums">
                        {formatUSD(position.collectedFeesUSD)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Uncollected</span>
                      <span className="text-profit tabular-nums">
                        {formatUSD(position.uncollectedFeesUSD)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1">
                      <span className="text-muted-foreground font-medium">Total</span>
                      <span className="text-profit font-semibold tabular-nums">
                        {formatUSD((m?.totalFeesUSD ?? 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Range chart */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                  Price Range & History
                </p>
                <PriceRangeChart
                  pool={pool}
                  priceLower={position.priceLower}
                  priceUpper={position.priceUpper}
                  currentPrice={position.currentPrice}
                  inRange={position.inRange}
                  height={150}
                />
              </div>

              {/* Position metadata */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Opened</p>
                  <p>{formatDate(position.createdAtTimestamp)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Deposited</p>
                  <p>{formatUSD(position.depositedUSD)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">IL (est.)</p>
                  <p className={pnlClass(m?.impermanentLoss ?? 0)}>
                    {formatPct(m?.impermanentLoss ?? 0, 2)}
                  </p>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => setSimOpen(true)}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Simulate Re-range
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => window.open(revertUrl, "_blank")}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View on Revert
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-xs text-muted-foreground"
                  onClick={() => window.open(uniUrl, "_blank")}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Uniswap
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SimulatorModal
        pool={pool}
        open={simOpen}
        onClose={() => setSimOpen(false)}
      />
    </>
  );
}
