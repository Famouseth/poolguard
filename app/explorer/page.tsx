"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  Search,
  TrendingUp,
  Activity,
  Layers,
  ArrowRightLeft,
  ExternalLink,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenPair } from "@/components/shared/token-pair";
import { ChainBadge } from "@/components/shared/chain-badge";
import { FeeTierBadge } from "@/components/shared/fee-tier-badge";
import { usePools } from "@/hooks/use-pools";
import { usePoolTrades } from "@/hooks/use-pool-trades";
import { usePoolOHLCV } from "@/hooks/use-pool-ohlcv";
import { formatUSD, formatPct, aprClass } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Pool } from "@/types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";

// --- Helpers ---

function fmtRelative(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function chainExplorerBase(chainId: number): string {
  if (chainId === 8453) return "https://basescan.org";
  if (chainId === 56) return "https://bscscan.com";
  return "https://etherscan.io";
}

// --- Stat box ---

function Stat({
  label,
  value,
  sub,
  colour,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  colour?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </p>
      <p className={cn("text-sm font-bold tabular-nums", colour ?? "text-foreground")}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground tabular-nums">{sub}</p>}
    </div>
  );
}

// --- Detail panel ---

function PoolDetailPanel({ pool }: { pool: Pool }) {
  const [chartRange, setChartRange] = useState<"hour" | "day">("hour");

  const { data: candles = [], isFetching: ohlcvFetching } = usePoolOHLCV(
    pool.id,
    pool.chainId,
    "hour",
    chartRange === "hour" ? 24 : 168,
  );

  const { data: trades = [], isFetching: tradesFetching } = usePoolTrades(pool.id, pool.chainId);

  const chartData = useMemo(
    () =>
      candles.map((c) => ({
        label: new Date(c.timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        price: c.close,
        volume: c.volume,
      })),
    [candles],
  );

  const buys = trades.filter((t) => t.kind === "buy").length;
  const sells = trades.filter((t) => t.kind === "sell").length;
  const avgTradeUSD = trades.length ? trades.reduce((s, t) => s + t.volumeUSD, 0) / trades.length : 0;

  const explorerBase = chainExplorerBase(pool.chainId);
  const uniswapUrl = `https://app.uniswap.org/explore/pools/${
    pool.chainId === 1 ? "ethereum" : pool.chainId === 8453 ? "base" : "bnb"
  }/${pool.id}`;

  return (
    <div className="space-y-4">
      {/* Pool header */}
      <Card className="glass">
        <CardContent className="py-4 px-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <TokenPair token0={pool.token0} token1={pool.token1} size="lg" />
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <FeeTierBadge feeTier={pool.feeTier} />
                  <ChainBadge chainId={pool.chainId} />
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">{pool.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <a href={`${explorerBase}/address/${pool.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                Etherscan <ExternalLink className="w-3 h-3" />
              </a>
              <a href={uniswapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                Uniswap <ExternalLink className="w-3 h-3" />
              </a>
              <a href={`https://www.geckoterminal.com/${pool.chainId === 1 ? "eth" : pool.chainId === 8453 ? "base" : "bsc"}/pools/${pool.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                GeckoTerminal <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mt-4 pt-4 border-t border-border">
            <Stat label="TVL" value={formatUSD(pool.totalValueLockedUSD, true)} icon={Layers} />
            <Stat label="24h Volume" value={formatUSD(pool.volumeUSD24h, true)} icon={Activity} />
            <Stat label="Fee APR" value={formatPct(pool.feeAPR ?? 0, 1)} colour={aprClass(pool.feeAPR ?? 0)} icon={TrendingUp} />
            <Stat label="7d APR" value={formatPct(pool.feeAPR7d ?? 0, 1)} colour={aprClass(pool.feeAPR7d ?? 0)} />
            <Stat label="24h Fees" value={formatUSD(pool.feesUSD24h, true)} sub={pool.totalValueLockedUSD > 0 ? `$${((pool.feesUSD24h / pool.totalValueLockedUSD) * 1000).toFixed(2)} per $1K` : "$0"} />
            <Stat label="Vol/TVL" value={`${pool.volumeToTVL != null ? pool.volumeToTVL.toFixed(2) : "0"}x`} sub="Cap. efficiency" />
          </div>
        </CardContent>
      </Card>

      {/* Price & Volume chart */}
      <Card className="glass">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              {ohlcvFetching && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
              {pool.token0.symbol} / {pool.token1.symbol} Price & Volume
            </p>
            <div className="flex gap-1">
              {(["hour", "day"] as const).map((r) => (
                <button key={r} onClick={() => setChartRange(r)} className={cn("px-2 py-0.5 rounded text-xs transition-colors", chartRange === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {r === "hour" ? "24H" : "7D"}
                </button>
              ))}
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">
              {ohlcvFetching ? "Loading chart..." : "No chart data available"}
            </div>
          ) : (
            <div className="space-y-1">
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(217,32%,14%)" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={60} tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(v < 1 ? 4 : 2)}`} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ background: "hsl(222,47%,9%)", border: "1px solid hsl(217,32%,18%)", borderRadius: 6, fontSize: 11 }} formatter={(v: number) => [`$${v >= 1000 ? v.toFixed(2) : v.toFixed(v < 1 ? 6 : 4)}`, "Price"]} />
                  <Area type="monotone" dataKey="price" stroke="#3B82F6" fill="url(#priceGrad)" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={60}>
                <BarChart data={chartData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                  <XAxis dataKey="label" hide />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "hsl(222,47%,9%)", border: "1px solid hsl(217,32%,18%)", borderRadius: 6, fontSize: 11 }} formatter={(v: number) => [formatUSD(v, true), "Volume"]} />
                  <Bar dataKey="volume" fill="#3B82F6" opacity={0.5} radius={[1, 1, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pool Stats */}
      <Card className="glass">
        <CardContent className="py-4 px-5">
          <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-primary" />
            Pool Stats
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Recent Txns" value={`${trades.length}`} sub={`${buys} buys / ${sells} sells`} />
            <Stat label="Avg Trade Size" value={formatUSD(avgTradeUSD, true)} sub="last ~300 trades" />
            <Stat label="24h Fees" value={formatUSD(pool.feesUSD24h, true)} sub={`Fee tier: ${(pool.feeTier / 10000).toFixed(2)}%`} />
            <Stat label="Daily $ per $1K LP" value={pool.totalValueLockedUSD > 0 ? formatUSD((pool.feesUSD24h / pool.totalValueLockedUSD) * 1000) : "$0"} sub="est. fee income" />
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="glass">
        <CardContent className="py-4 px-5">
          <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            Recent Transactions
            {tradesFetching && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground ml-1" />}
          </p>

          {trades.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {tradesFetching ? "Loading transactions..." : "No recent transactions"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left pb-2 font-medium">Type</th>
                    <th className="text-right pb-2 font-medium">{pool.token0.symbol}</th>
                    <th className="text-right pb-2 font-medium">{pool.token1.symbol}</th>
                    <th className="text-right pb-2 font-medium">Value</th>
                    <th className="text-right pb-2 font-medium">Wallet</th>
                    <th className="text-right pb-2 font-medium">Time</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 50).map((trade, i) => {
                    const isBuy = trade.kind === "buy";
                    const fromIsToken0 = trade.fromTokenAddress.toLowerCase() === pool.token0.address.toLowerCase();
                    const token0Amount = fromIsToken0 ? trade.fromAmount : trade.toAmount;
                    const token1Amount = fromIsToken0 ? trade.toAmount : trade.fromAmount;
                    return (
                      <tr key={`${trade.txHash}-${i}`} className="border-b border-border/40 hover:bg-secondary/20">
                        <td className="py-1.5">
                          <span className={cn("flex items-center gap-1 font-semibold", isBuy ? "text-profit" : "text-loss")}>
                            {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {isBuy ? "Buy" : "Sell"}
                          </span>
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                          {token0Amount >= 1000 ? `${(token0Amount / 1000).toFixed(2)}K` : token0Amount.toFixed(token0Amount < 0.001 ? 6 : 4)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                          {token1Amount >= 1000 ? `${(token1Amount / 1000).toFixed(2)}K` : token1Amount.toFixed(token1Amount < 0.001 ? 6 : 4)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums font-medium">{formatUSD(trade.volumeUSD, true)}</td>
                        <td className="py-1.5 text-right">
                          <a href={`${explorerBase}/address/${trade.walletAddress}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">
                            {shortAddr(trade.walletAddress)}
                          </a>
                        </td>
                        <td className="py-1.5 text-right text-muted-foreground">{fmtRelative(trade.timestamp)}</td>
                        <td className="py-1.5 pl-2">
                          <a href={`${explorerBase}/tx/${trade.txHash}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Page ---

export default function ExplorerPage() {
  const { allPools, isLoading } = usePools();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Pool | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (allPools ?? []).filter((p) =>
      `${p.token0.symbol}/${p.token1.symbol} ${p.id}`.toLowerCase().includes(q),
    );
  }, [allPools, search]);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Pool Explorer
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Live pool stats, price history, and real-time swap feed for top-tier Uniswap V3 pools.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search by token or address..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Pool list */}
        <div className="lg:w-72 shrink-0 space-y-1">
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            : filtered.map((pool) => {
                const isSelected = selected?.id === pool.id && selected?.chainId === pool.chainId;
                return (
                  <button
                    key={`${pool.chainId}-${pool.id}`}
                    onClick={() => setSelected(pool)}
                    className={cn("w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all", isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 hover:bg-secondary/40")}
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <TokenPair token0={pool.token0} token1={pool.token1} size="sm" />
                        <FeeTierBadge feeTier={pool.feeTier} />
                      </div>
                      <div className="flex items-center gap-2">
                        <ChainBadge chainId={pool.chainId} size="sm" />
                        <span className="text-[10px] text-muted-foreground tabular-nums">TVL {formatUSD(pool.totalValueLockedUSD, true)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={cn("text-xs font-bold tabular-nums", aprClass(pool.feeAPR ?? 0))}>{formatPct(pool.feeAPR ?? 0, 1)}</p>
                      <p className="text-[10px] text-muted-foreground">APR</p>
                    </div>
                  </button>
                );
              })}
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <PoolDetailPanel pool={selected} />
          ) : (
            <div className="flex flex-col items-center justify-center h-60 text-muted-foreground gap-3 rounded-lg border border-border">
              <BarChart3 className="w-10 h-10" />
              <div className="text-center">
                <p className="text-sm font-medium">Select a pool to view details</p>
                <p className="text-xs mt-1">Price chart · live trades · fee analytics</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}