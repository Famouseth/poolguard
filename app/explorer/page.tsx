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
  Plus,
  Minus,
  Coins,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenPair } from "@/components/shared/token-pair";
import { ChainBadge } from "@/components/shared/chain-badge";
import { FeeTierBadge } from "@/components/shared/fee-tier-badge";
import { usePools } from "@/hooks/use-pools";
import { usePoolTrades } from "@/hooks/use-pool-trades";
import { usePoolOHLCV } from "@/hooks/use-pool-ohlcv";
import { usePoolEvents } from "@/hooks/use-pool-events";
import { usePoolPositions } from "@/hooks/use-pool-positions";
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

// --- Chain helpers ---

function explorerBase(chainId: number) {
  if (chainId === 8453) return "https://basescan.org";
  if (chainId === 56) return "https://bscscan.com";
  return "https://etherscan.io";
}

function dexscreenerChain(chainId: number) {
  if (chainId === 8453) return "base";
  if (chainId === 56) return "bsc";
  return "ethereum";
}

function dextoolsChain(chainId: number) {
  if (chainId === 8453) return "base";
  if (chainId === 56) return "bnb";
  return "ether";
}

function uniswapChain(chainId: number) {
  if (chainId === 8453) return "base";
  if (chainId === 56) return "bnb";
  return "ethereum";
}

// --- Misc helpers ---

function fmtRelative(ts: number | string) {
  const t = typeof ts === "string" ? new Date(ts).getTime() / 1000 : ts;
  const diff = Math.floor(Date.now() / 1000 - t);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmtNum(n: number, dp = 4) {
  if (n === 0) return "0";
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(n < 0.001 ? 6 : dp);
}

// --- Unavailable notice ---

function UnavailableNotice({ pool, label }: { pool: Pool; label: string }) {
  const revertUrl = `https://revert.finance/#/pools/${uniswapChain(pool.chainId)}/${pool.id}`;
  const dexUrl = `https://dexscreener.com/${dexscreenerChain(pool.chainId)}/${pool.id}`;
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-center space-y-2">
      <p className="text-xs text-amber-400 font-medium">{label} data unavailable — on-chain indexer offline</p>
      <p className="text-[11px] text-muted-foreground">The Graph hosted service was shut down. View live data externally:</p>
      <div className="flex justify-center gap-4 text-xs">
        <a href={revertUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
          Revert.finance <ExternalLink className="w-3 h-3" />
        </a>
        <a href={dexUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
          DexScreener <ExternalLink className="w-3 h-3" />
        </a>
        <a href={`${explorerBase(pool.chainId)}/address/${pool.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
          Etherscan <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
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

// --- Tab button ---

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 text-xs rounded transition-colors font-medium",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
      )}
    >
      {children}
    </button>
  );
}

// --- Chart source + tx tab types ---

type ChartSrc = "dexscreener" | "dextools" | "ohlcv";
type TxTab = "swaps" | "lp";

// --- Detail panel ---

function PoolDetailPanel({ pool }: { pool: Pool }) {
  const [chartSrc, setChartSrc] = useState<ChartSrc>("dexscreener");
  const [chartRange, setChartRange] = useState<"hour" | "day">("hour");
  const [txTab, setTxTab] = useState<TxTab>("swaps");

  const { data: candles = [], isFetching: ohlcvFetching } = usePoolOHLCV(
    chartSrc === "ohlcv" ? pool.id : null,
    pool.chainId,
    "hour",
    chartRange === "hour" ? 24 : 168,
  );

  const { data: trades = [], isFetching: tradesFetching } = usePoolTrades(pool.id, pool.chainId);

  const { data: eventsResp, isFetching: eventsFetching } = usePoolEvents(
    txTab === "lp" ? pool.id : null,
    pool.chainId,
  );

  const { data: posResp, isFetching: posFetching } = usePoolPositions(pool.id, pool.chainId);

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
  const sells = trades.length - buys;
  const avgTradeUSD = trades.length ? trades.reduce((s, t) => s + t.volumeUSD, 0) / trades.length : 0;

  const explorer = explorerBase(pool.chainId);
  const uniUrl = `https://app.uniswap.org/explore/pools/${uniswapChain(pool.chainId)}/${pool.id}`;
  const revUrl = `https://revert.finance/#/pools/${uniswapChain(pool.chainId)}/${pool.id}`;

  const dexScreenerUrl = `https://dexscreener.com/${dexscreenerChain(pool.chainId)}/${pool.id}?embed=1&theme=dark&info=0`;
  const dexToolsUrl = `https://www.dextools.io/widget-chart/en/${dextoolsChain(pool.chainId)}/pe-light/${pool.id}?theme=dark&chartType=1&chartResolution=30`;

  const events = eventsResp?.events ?? [];
  const eventsUnavailable = eventsResp?.unavailable ?? false;
  const positions = posResp?.positions ?? [];
  const posUnavailable = posResp?.unavailable ?? false;

  return (
    <div className="space-y-4">
      {/* ── Pool header ── */}
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
                <p className="text-[11px] text-muted-foreground font-mono break-all">{pool.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              {([
                ["Etherscan", `${explorer}/address/${pool.id}`],
                ["Uniswap", uniUrl],
                ["Revert", revUrl],
                ["DexScreener", `https://dexscreener.com/${dexscreenerChain(pool.chainId)}/${pool.id}`],
                ["GeckoTerminal", `https://www.geckoterminal.com/${pool.chainId === 1 ? "eth" : pool.chainId === 8453 ? "base" : "bsc"}/pools/${pool.id}`],
              ] as [string, string][]).map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground transition-colors">
                  {label} <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mt-4 pt-4 border-t border-border">
            <Stat label="TVL" value={formatUSD(pool.totalValueLockedUSD, true)} icon={Layers} />
            <Stat label="24h Volume" value={formatUSD(pool.volumeUSD24h, true)} icon={Activity} />
            <Stat label="Fee APR" value={formatPct(pool.feeAPR ?? 0, 1)} colour={aprClass(pool.feeAPR ?? 0)} icon={TrendingUp} />
            <Stat label="7d APR" value={formatPct(pool.feeAPR7d ?? 0, 1)} colour={aprClass(pool.feeAPR7d ?? 0)} />
            <Stat label="24h Fees" value={formatUSD(pool.feesUSD24h, true)} sub={pool.totalValueLockedUSD > 0 ? `$${((pool.feesUSD24h / pool.totalValueLockedUSD) * 1000).toFixed(2)}/K` : "$0"} />
            <Stat label="Vol/TVL" value={`${pool.volumeToTVL != null ? pool.volumeToTVL.toFixed(2) : "0"}x`} sub="Cap efficiency" />
          </div>
        </CardContent>
      </Card>

      {/* ── Chart: DexScreener / DexTools / Internal OHLCV ── */}
      <Card className="glass">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex gap-1">
              <Tab active={chartSrc === "dexscreener"} onClick={() => setChartSrc("dexscreener")}>DexScreener</Tab>
              <Tab active={chartSrc === "dextools"} onClick={() => setChartSrc("dextools")}>DexTools</Tab>
              <Tab active={chartSrc === "ohlcv"} onClick={() => setChartSrc("ohlcv")}>
                {ohlcvFetching ? (
                  <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" />Chart</span>
                ) : "Chart"}
              </Tab>
            </div>
            {chartSrc === "ohlcv" && (
              <div className="flex gap-1">
                <Tab active={chartRange === "hour"} onClick={() => setChartRange("hour")}>24H</Tab>
                <Tab active={chartRange === "day"} onClick={() => setChartRange("day")}>7D</Tab>
              </div>
            )}
          </div>

          {chartSrc === "dexscreener" && (
            <div className="w-full rounded-lg overflow-hidden" style={{ height: 460 }}>
              <iframe
                src={dexScreenerUrl}
                style={{ width: "100%", height: "100%", border: 0 }}
                title="DexScreener Chart"
                loading="lazy"
                allow="clipboard-write"
              />
            </div>
          )}

          {chartSrc === "dextools" && (
            <div className="w-full rounded-lg overflow-hidden" style={{ height: 460 }}>
              <iframe
                src={dexToolsUrl}
                style={{ width: "100%", height: "100%", border: 0 }}
                title="DexTools Chart"
                loading="lazy"
              />
            </div>
          )}

          {chartSrc === "ohlcv" && (
            chartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground text-xs">
                {ohlcvFetching ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /><span>Loading chart...</span></>
                ) : (
                  <>
                    <span>No internal chart data — switch to DexScreener or DexTools.</span>
                    <div className="flex gap-3">
                      <button onClick={() => setChartSrc("dexscreener")} className="text-primary hover:underline">→ DexScreener</button>
                      <button onClick={() => setChartSrc("dextools")} className="text-primary hover:underline">→ DexTools</button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <ResponsiveContainer width="100%" height={200}>
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
                  <BarChart data={chartData} margin={{ left: 0, right: 0 }}>
                    <XAxis dataKey="label" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: "hsl(222,47%,9%)", border: "1px solid hsl(217,32%,18%)", borderRadius: 6, fontSize: 11 }} formatter={(v: number) => [formatUSD(v, true), "Volume"]} />
                    <Bar dataKey="volume" fill="#3B82F6" opacity={0.5} radius={[1, 1, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* ── Pool Stats ── */}
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

      {/* ── Transactions: Swaps + LP Events tabs ── */}
      <Card className="glass">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex gap-1">
              <Tab active={txTab === "swaps"} onClick={() => setTxTab("swaps")}>
                <span className="flex items-center gap-1">
                  <ArrowRightLeft className="w-3 h-3" />Swaps
                </span>
              </Tab>
              <Tab active={txTab === "lp"} onClick={() => setTxTab("lp")}>
                <span className="flex items-center gap-1">
                  <Coins className="w-3 h-3" />LP Events
                </span>
              </Tab>
            </div>
            {(txTab === "swaps" ? tradesFetching : eventsFetching) && (
              <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Swaps */}
          {txTab === "swaps" && (
            trades.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                {tradesFetching ? "Loading..." : "No recent swaps"}
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
                      const fromIsT0 = trade.fromTokenAddress.toLowerCase() === pool.token0.address.toLowerCase();
                      const t0Amt = fromIsT0 ? trade.fromAmount : trade.toAmount;
                      const t1Amt = fromIsT0 ? trade.toAmount : trade.fromAmount;
                      return (
                        <tr key={`${trade.txHash}-${i}`} className="border-b border-border/40 hover:bg-secondary/20">
                          <td className="py-1.5">
                            <span className={cn("flex items-center gap-1 font-semibold", isBuy ? "text-profit" : "text-loss")}>
                              {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {isBuy ? "Buy" : "Sell"}
                            </span>
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-muted-foreground">{fmtNum(t0Amt)}</td>
                          <td className="py-1.5 text-right tabular-nums text-muted-foreground">{fmtNum(t1Amt)}</td>
                          <td className="py-1.5 text-right tabular-nums font-medium">{formatUSD(trade.volumeUSD, true)}</td>
                          <td className="py-1.5 text-right">
                            <a href={`${explorer}/address/${trade.walletAddress}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">
                              {shortAddr(trade.walletAddress)}
                            </a>
                          </td>
                          <td className="py-1.5 text-right text-muted-foreground">{fmtRelative(trade.timestamp)}</td>
                          <td className="py-1.5 pl-2">
                            <a href={`${explorer}/tx/${trade.txHash}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* LP Events */}
          {txTab === "lp" && (
            eventsUnavailable ? (
              <UnavailableNotice pool={pool} label="LP Events" />
            ) : events.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                {eventsFetching ? "Loading LP events..." : "No recent LP events"}
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
                    {events.map((ev) => (
                      <tr key={ev.id} className="border-b border-border/40 hover:bg-secondary/20">
                        <td className="py-1.5">
                          <span className={cn("flex items-center gap-1 font-semibold", ev.kind === "mint" ? "text-profit" : "text-amber-400")}>
                            {ev.kind === "mint" ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            {ev.kind === "mint" ? "Add LP" : "Remove LP"}
                          </span>
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-muted-foreground">{fmtNum(ev.amount0)}</td>
                        <td className="py-1.5 text-right tabular-nums text-muted-foreground">{fmtNum(ev.amount1)}</td>
                        <td className="py-1.5 text-right tabular-nums font-medium">{formatUSD(ev.amountUSD, true)}</td>
                        <td className="py-1.5 text-right">
                          <a href={`${explorer}/address/${ev.owner}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">
                            {shortAddr(ev.owner)}
                          </a>
                        </td>
                        <td className="py-1.5 text-right text-muted-foreground">{fmtRelative(ev.timestamp)}</td>
                        <td className="py-1.5 pl-2">
                          <a href={`${explorer}/tx/${ev.txHash}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* ── V3 NFT LP Holders ── */}
      <Card className="glass">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary" />
              V3 NFT LP Holders
              <span className="text-xs text-muted-foreground font-normal">({positions.length} active)</span>
            </p>
            {posFetching && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
          </div>

          {posUnavailable ? (
            <UnavailableNotice pool={pool} label="LP Positions" />
          ) : positions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {posFetching ? "Loading LP holders..." : "No active LP positions found"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left pb-2 font-medium">NFT #</th>
                    <th className="text-left pb-2 font-medium">Owner</th>
                    <th className="text-right pb-2 font-medium">Dep {pool.token0.symbol}</th>
                    <th className="text-right pb-2 font-medium">Dep {pool.token1.symbol}</th>
                    <th className="text-right pb-2 font-medium">Fees {pool.token0.symbol}</th>
                    <th className="text-right pb-2 font-medium">Fees {pool.token1.symbol}</th>
                    <th className="text-right pb-2 font-medium">Range</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos) => {
                    const nftUrl = `https://app.uniswap.org/positions/v3/${uniswapChain(pool.chainId)}/${pos.nftId}`;
                    const ownerUrl = `${explorer}/address/${pos.owner}`;
                    const txUrl = `${explorer}/tx/${pos.txHash}`;
                    const nftScanUrl = `${explorer}/token/0xC36442b4a4522E871399CD717aBDD847Ab11FE88?a=${pos.nftId}`;
                    return (
                      <tr key={pos.nftId} className="border-b border-border/40 hover:bg-secondary/20">
                        <td className="py-1.5">
                          <a href={nftUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono font-semibold">
                            #{pos.nftId}
                          </a>
                        </td>
                        <td className="py-1.5">
                          <a href={ownerUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground font-mono">
                            {shortAddr(pos.owner)}
                          </a>
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-muted-foreground">{fmtNum(pos.depositedToken0)}</td>
                        <td className="py-1.5 text-right tabular-nums text-muted-foreground">{fmtNum(pos.depositedToken1)}</td>
                        <td className="py-1.5 text-right tabular-nums text-profit">{fmtNum(pos.collectedFeesToken0)}</td>
                        <td className="py-1.5 text-right tabular-nums text-profit">{fmtNum(pos.collectedFeesToken1)}</td>
                        <td className="py-1.5 text-right text-muted-foreground tabular-nums text-[10px]">
                          {pos.tickLower} / {pos.tickUpper}
                        </td>
                        <td className="py-1.5 pl-2">
                          <div className="flex gap-1.5">
                            <a href={nftScanUrl} target="_blank" rel="noopener noreferrer" title="NFT on explorer" className="text-muted-foreground hover:text-foreground">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <a href={txUrl} target="_blank" rel="noopener noreferrer" title="Creation tx" className="text-muted-foreground hover:text-foreground">
                              <ArrowRightLeft className="w-3 h-3" />
                            </a>
                          </div>
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
          Live charts (DexScreener · DexTools · OHLCV), real-time swaps, LP events, and V3 NFT holder breakdown.
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
                <p className="text-xs mt-1">DexScreener / DexTools charts · live swaps · LP events · V3 NFT holders</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}