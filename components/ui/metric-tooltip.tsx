/**
 * MetricTooltip — wraps a metric label/value with an explanatory tooltip.
 * Revert.finance style: hover the ⓘ icon to see the definition.
 */
"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MetricTooltipProps {
  label: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

export function MetricTooltip({
  label,
  description,
  children,
  className,
}: MetricTooltipProps) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] leading-relaxed">
              {description}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="text-sm font-semibold tabular-nums">{children}</div>
    </div>
  );
}

// ─── Pre-defined metric tooltips ──────────────────────────────────────────

export const METRIC_TOOLTIPS = {
  feeAPR: "Annual Percentage Rate earned from swap fees alone, extrapolated from the last 24 hours. Does NOT include impermanent loss or gas costs.",
  feeAPR7d: "Fee APR averaged over the last 7 days. More stable than 24h APR for volatile pools.",
  poolPnL:
    "Pool PnL = (Current Value + All Fees − Deposited Value). This is your total return including fees minus any divergence loss. Positive means you profited vs. your entry cost.",
  hodlPnL:
    "HODL PnL = what your deposited tokens would be worth today if you had simply held them without providing liquidity.",
  divergencePnL:
    "Divergence PnL = Pool PnL − HODL PnL. Also called 'LP Alpha'. Positive means your fees outpaced impermanent loss. Negative means IL hurt more than fees helped.",
  impermanentLoss:
    "Impermanent Loss (IL) is the difference between holding tokens vs. providing liquidity, caused by price divergence. It becomes 'permanent' when you close the position.",
  rangeProgress:
    "Shows where the current price sits within your tick range (0% = at lower bound, 100% = at upper bound, 50% = perfectly centred). Out-of-range positions earn zero fees.",
  volumeToTVL:
    "Volume / TVL ratio. Higher is better: it means the pool is more active relative to its size, generating more fees per dollar of liquidity.",
  healthScore:
    "Composite score 0–100 based on: in-range status (40 pts), price centring (20 pts), fee APR (30 pts), position age (10 pts). Green ≥75, Yellow ≥50, Red <50.",
  roi: "Return on Investment: (Pool PnL / Deposited Value) × 100, without annualisation.",
  capitalEfficiency:
    "How concentrated your liquidity is vs. a full-range V2-style position. A 10× value means your liquidity earns 10× more fees per dollar compared to full-range.",
} as const;
