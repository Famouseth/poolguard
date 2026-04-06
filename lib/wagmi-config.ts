/**
 * Wagmi + RainbowKit configuration.
 * Uses getDefaultConfig for the simplest possible setup with RainbowKit v2.
 */
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, base, bsc } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "PoolGuard",
  appDescription: "Uniswap V3 analytics dashboard for blue-chip & LST pairs",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "MISSING_PROJECT_ID",
  chains: [mainnet, base, bsc],
  ssr: true,
});
