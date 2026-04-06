/**
 * Shared: ChainBadge — coloured pill showing the chain name.
 */
import { CHAIN_SHORT, CHAIN_COLORS } from "@/lib/constants";
import type { ChainId } from "@/types";
import { cn } from "@/lib/utils";

interface ChainBadgeProps {
  chainId: ChainId;
  className?: string;
  size?: "sm" | "md";
}

export function ChainBadge({ chainId, className, size = "sm" }: ChainBadgeProps) {
  const color = CHAIN_COLORS[chainId];
  const label = CHAIN_SHORT[chainId];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        className,
      )}
      style={{ backgroundColor: `${color}22`, color }}
    >
      <span
        className="inline-block rounded-full"
        style={{
          width: size === "sm" ? 5 : 6,
          height: size === "sm" ? 5 : 6,
          backgroundColor: color,
        }}
      />
      {label}
    </span>
  );
}
