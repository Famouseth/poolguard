/**
 * Wagmi + RainbowKit configuration.
 * Uses fallback transports over free public RPCs from chainlist.org (no API key needed).
 */
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, base, bsc } from "wagmi/chains";
import { http, fallback } from "wagmi";
import { DEFAULT_RPC } from "@/lib/constants";

export const wagmiConfig = getDefaultConfig({
  appName: "PoolGuard",
  appDescription: "Uniswap V3 analytics dashboard for blue-chip & LST pairs",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "MISSING_PROJECT_ID",
  chains: [mainnet, base, bsc],
  transports: {
    [mainnet.id]: fallback(DEFAULT_RPC[1].map((url) => http(url))),
    [base.id]: fallback(DEFAULT_RPC[8453].map((url) => http(url))),
    [bsc.id]: fallback(DEFAULT_RPC[56].map((url) => http(url))),
  },
  ssr: true,
});
