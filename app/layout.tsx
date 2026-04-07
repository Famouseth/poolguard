import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/layout/AppShell";
import { MatrixRain } from "@/components/layout/MatrixRain";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | PoolGuard",
    default: "PoolGuard — Uniswap V3 LP Analytics",
  },
  description:
    "Track Uniswap V3 liquidity positions with Revert-style PnL, Fee APR, IL metrics and pool discovery for ETH, Base, and BNB. Focused on WETH, USDC, WBTC, and LSTs.",
  keywords: ["Uniswap V3", "DeFi", "liquidity", "LP", "impermanent loss", "wstETH", "cbBTC"],
};

export const viewport: Viewport = {
  themeColor: "#000300",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <MatrixRain />
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
