/**
 * SimulatorModal — opens when user clicks "Simulate" on a pool.
 * Shows projected fee earnings, IL, and net return for a hypothetical position.
 */
"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Calculator, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TokenPair } from "@/components/shared/token-pair";
import { FeeTierBadge } from "@/components/shared/fee-tier-badge";
import { ChainBadge } from "@/components/shared/chain-badge";
import { MetricTooltip, METRIC_TOOLTIPS } from "@/components/ui/metric-tooltip";
import { simulatePosition, suggestRange } from "@/lib/calculations";
import { formatUSD, formatPct, pnlClass } from "@/lib/utils";
import type { Pool, SimulationResult } from "@/types";
import { cn } from "@/lib/utils";

interface SimulatorModalProps {
  pool: Pool | null;
  open: boolean;
  onClose: () => void;
}

const DURATION_OPTIONS = [
  { label: "7d",   days: 7 },
  { label: "30d",  days: 30 },
  { label: "90d",  days: 90 },
  { label: "180d", days: 180 },
  { label: "1yr",  days: 365 },
];

export function SimulatorModal({ pool, open, onClose }: SimulatorModalProps) {
  const [investment, setInvestment] = useState("10000");
  const [daysHeld, setDaysHeld] = useState(30);
  const [rangeType, setRangeType] = useState<"tight" | "medium" | "wide">("medium");

  if (!pool) return null;

  // Estimate volatility from price range of last 7 day data
  const dayData = pool.poolDayData ?? [];
  const prices = dayData.map((d) => d.close).filter(Boolean);
  let estimatedVol = 0.6; // default 60% annualised
  if (prices.length >= 3) {
    const logReturns = prices.slice(0, -1).map((p, i) => Math.log(p / prices[i + 1]));
    const dailyStdDev = Math.sqrt(
      logReturns.reduce((s, r) => s + r * r, 0) / logReturns.length,
    );
    estimatedVol = dailyStdDev * Math.sqrt(365);
  }

  const suggestion = suggestRange(pool.token0Price, estimatedVol);
  const selected = suggestion[rangeType];

  const investmentUSD = parseFloat(investment) || 0;
  const result: SimulationResult = simulatePosition({
    pool,
    investmentUSD,
    priceLower: selected.lower,
    priceUpper: selected.upper,
    daysHeld,
  });

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl animate-in fade-in-0 zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/15 rounded-lg">
                <Calculator className="w-4 h-4 text-primary" />
              </div>
              <div>
                <Dialog.Title className="font-semibold text-foreground">
                  Position Simulator
                </Dialog.Title>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <TokenPair token0={pool.token0} token1={pool.token1} size="sm" />
                  <FeeTierBadge feeTier={pool.feeTier} />
                  <ChainBadge chainId={pool.chainId} />
                </div>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            {/* Investment */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Investment Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  className="pl-7"
                  value={investment}
                  onChange={(e) => setInvestment(e.target.value)}
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Hold Duration</label>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map(({ label, days }) => (
                  <button
                    key={days}
                    onClick={() => setDaysHeld(days)}
                    className={cn(
                      "flex-1 py-1.5 rounded text-xs font-medium border transition-all",
                      daysHeld === days
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Range selection */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Range Strategy (based on ~{(estimatedVol * 100).toFixed(0)}% annualised vol)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["tight", "medium", "wide"] as const).map((type) => {
                  const opt = suggestion[type];
                  return (
                    <button
                      key={type}
                      onClick={() => setRangeType(type)}
                      className={cn(
                        "text-left p-3 rounded-lg border transition-all",
                        rangeType === type
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <p className="text-xs font-semibold capitalize text-foreground">{type}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        ±{(opt.widthPct / 2).toFixed(0)}% range
                      </p>
                      <p className="text-[10px] text-primary mt-0.5">
                        {opt.expectedCapitalEfficiency.toFixed(1)}× efficiency
                      </p>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Range: {selected.lower.toFixed(4)} – {selected.upper.toFixed(4)}
              </p>
            </div>

            {/* Results */}
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-profit" />
                Projected Results ({daysHeld}d)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <MetricTooltip label="Fees Earned" description={METRIC_TOOLTIPS.feeAPR}>
                  <span className="text-profit tabular-nums">
                    {formatUSD(result.feesEarnedUSD)}
                  </span>
                </MetricTooltip>
                <MetricTooltip label="Fee APR" description={METRIC_TOOLTIPS.feeAPR}>
                  <span className="text-profit tabular-nums">
                    {formatPct(result.feeAPR, 1)}
                  </span>
                </MetricTooltip>
                <MetricTooltip
                  label="Estimated IL"
                  description={METRIC_TOOLTIPS.impermanentLoss}
                >
                  <span className={pnlClass(result.impermanentLoss)}>
                    {formatPct(result.impermanentLoss, 2)}
                  </span>
                </MetricTooltip>
                <MetricTooltip
                  label="Net Return"
                  description="Fees earned minus estimated impermanent loss."
                >
                  <span className={cn("tabular-nums", pnlClass(result.netReturnUSD))}>
                    {formatUSD(result.netReturnUSD)}
                  </span>
                </MetricTooltip>
                <MetricTooltip
                  label="Capital Efficiency"
                  description={METRIC_TOOLTIPS.capitalEfficiency}
                >
                  <span className="text-primary tabular-nums">
                    {result.capitalEfficiency.toFixed(1)}×
                  </span>
                </MetricTooltip>
                <MetricTooltip
                  label="Break-even Days"
                  description="Days until fees cover current estimated IL."
                >
                  <span className="tabular-nums">
                    {result.breakEvenDays > 0
                      ? `${result.breakEvenDays.toFixed(0)}d`
                      : "N/A"}
                  </span>
                </MetricTooltip>
              </div>

              {result.impermanentLoss < -10 && (
                <div className="flex items-start gap-2 mt-3 p-2.5 rounded bg-loss/10 border border-loss/20 text-loss text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  High estimated IL (&gt;10%) for this range. Consider a wider range or check
                  pool volatility before deploying.
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-5 pb-5">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm">
                Close
              </Button>
            </Dialog.Close>
            <Button
              size="sm"
              onClick={() =>
                window.open(`https://app.uniswap.org/add/${pool.token0.address}/${pool.token1.address}/${pool.feeTier}`, "_blank")
              }
            >
              Open in Uniswap
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
