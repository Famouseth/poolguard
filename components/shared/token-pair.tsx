"use client";

/**
 * Shared: TokenPair — displays a token pair logo + symbols.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TokenInfo } from "@/types";

interface TokenPairProps {
  token0: TokenInfo;
  token1: TokenInfo;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Token symbol → gradient colour map for fallback avatars */
const TOKEN_COLOURS: Record<string, [string, string]> = {
  WETH: ["#627EEA", "#8FA4EF"],
  ETH:  ["#627EEA", "#8FA4EF"],
  USDC: ["#2775CA", "#4DA0F0"],
  USDT: ["#26A17B", "#48C89A"],
  USDS: ["#F5A623", "#FFD080"],
  WBTC: ["#F7931A", "#FDB86B"],
  cbBTC:["#0052FF", "#4488FF"],
  cbETH:["#0052FF", "#4488FF"],
  XAUT: ["#D4AF37", "#F0D060"],
  PAXG: ["#D4AF37", "#F0D060"],
  wstETH:["#00A3FF", "#00D4FF"],
  stETH: ["#00A3FF", "#00D4FF"],
  rETH:  ["#FF6B35", "#FF9A6C"],
  WBNB:  ["#F3BA2F", "#FFDD80"],
  BTCB:  ["#F7931A", "#FDB86B"],
};

function TokenAvatar({ token, size, className }: { token: TokenInfo; size: "sm" | "md" | "lg"; className?: string }) {
  const px = size === "sm" ? 20 : size === "md" ? 24 : 32;
  const [imgError, setImgError] = useState(false);
  const [from, to] = TOKEN_COLOURS[token.symbol] ?? ["#4B5563", "#6B7280"];
  const showImg = !!token.logoURI && !imgError;

  return (
    <div
      className={cn("rounded-full flex items-center justify-center font-bold text-white shrink-0 border border-border overflow-hidden", className)}
      style={{
        width: px,
        height: px,
        fontSize: showImg ? undefined : px * 0.36,
        background: showImg ? undefined : `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      {showImg ? (
        <img
          src={token.logoURI!}
          alt={token.symbol}
          width={px}
          height={px}
          style={{ width: px, height: px, objectFit: "cover" }}
          onError={() => setImgError(true)}
        />
      ) : (
        token.symbol.slice(0, 2)
      )}
    </div>
  );
}

export function TokenPair({ token0, token1, size = "md", className }: TokenPairProps) {
  const textSize = size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base";
  const overlap = size === "sm" ? "-ml-2" : "-ml-2.5";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Overlapping avatars */}
      <div className="flex items-center">
        <TokenAvatar token={token0} size={size} />
        <TokenAvatar token={token1} size={size} className={overlap} />
      </div>
      {/* Symbols */}
      <span className={cn("font-semibold text-foreground", textSize)}>
        {token0.symbol}/{token1.symbol}
      </span>
    </div>
  );
}

// Also export a single token avatar for use elsewhere
export { TokenAvatar };
