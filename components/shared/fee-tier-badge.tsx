import { FEE_TIER_LABELS } from "@/lib/constants";
import type { FeeTier } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface FeeTierBadgeProps {
  feeTier: number;
  className?: string;
}

const TIER_COLOURS: Record<number, string> = {
  100:   "bg-purple-500/15 text-purple-400",
  500:   "bg-blue-500/15   text-blue-400",
  3000:  "bg-cyan-500/15   text-cyan-400",
  10000: "bg-orange-500/15 text-orange-400",
};

export function FeeTierBadge({ feeTier, className }: FeeTierBadgeProps) {
  const label = FEE_TIER_LABELS[feeTier as FeeTier] ?? `${feeTier / 10000}%`;
  const colour = TIER_COLOURS[feeTier] ?? "bg-secondary text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold",
        colour,
        className,
      )}
    >
      {label}
    </span>
  );
}
