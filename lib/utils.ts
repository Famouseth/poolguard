import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import numeral from "numeral";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format USD with compact notation: $1.23M, $45.6K, $1,234 */
export function formatUSD(value: number, compact = false): string {
  if (!isFinite(value)) return "$0";
  if (compact) {
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  }
  return numeral(value).format("$0,0.00");
}

/** Format a percentage value with sign: +12.34%, -5.67% */
export function formatPct(value: number, decimals = 2): string {
  if (!isFinite(value)) return "0%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/** Format APR with colour class */
export function aprClass(apr: number): string {
  if (apr >= 20) return "text-profit";
  if (apr >= 5) return "text-yellow-400";
  return "text-muted-foreground";
}

/** Get profit/loss colour class */
export function pnlClass(value: number): string {
  if (value > 0) return "text-profit";
  if (value < 0) return "text-loss";
  return "text-muted-foreground";
}

/** Format token amounts: 1234.5678 → "1,234.57" */
export function formatToken(amount: number, decimals = 4): string {
  if (!isFinite(amount)) return "0";
  if (Math.abs(amount) < 0.0001 && amount !== 0) return "<0.0001";
  return numeral(amount).format(`0,0.${"0".repeat(decimals)}`);
}

/** Truncate an Ethereum address: 0x1234…abcd */
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/** Convert a Unix timestamp to a human-readable date string */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Days since a unix timestamp */
export function daysSince(timestamp: number): number {
  return (Date.now() / 1000 - timestamp) / 86400;
}

/** Determine if an address is a valid hex address */
export function isAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

/** Sleep for `ms` milliseconds (rate-limit-friendly) */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
