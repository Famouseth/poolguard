"use client";

/**
 * Shared: ChainBadge — coloured pill showing the chain name + logo.
 */
import { useState } from "react";
import { CHAIN_SHORT, CHAIN_COLORS, CHAIN_LOGOS } from "@/lib/constants";
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
  const logoSrc = CHAIN_LOGOS[chainId];
  const [imgError, setImgError] = useState(false);
  const iconSize = size === "sm" ? 12 : 14;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        className,
      )}
      style={{ backgroundColor: `${color}22`, color }}
    >
      {!imgError ? (
        <img
          src={logoSrc}
          alt={label}
          width={iconSize}
          height={iconSize}
          style={{ width: iconSize, height: iconSize, borderRadius: "50%", objectFit: "cover" }}
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className="inline-block rounded-full"
          style={{
            width: size === "sm" ? 5 : 6,
            height: size === "sm" ? 5 : 6,
            backgroundColor: color,
          }}
        />
      )}
      {label}
    </span>
  );
}
