"use client";

import { useState } from "react";
import { Bell, Plus, Trash2, Star, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TokenPair } from "@/components/shared/token-pair";
import { ChainBadge } from "@/components/shared/chain-badge";
import { useAppStore } from "@/store";
import { usePools } from "@/hooks/use-pools";
import { formatPct, formatDate } from "@/lib/utils";
import type { AlertType } from "@/types";

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  apr_spike: "APR Spike",
  range_exit: "Range Exit",
  volume_surge: "Volume Surge",
  fee_collect: "Fee Collect",
};

export default function AlertsPage() {
  const { alerts, watchlist, addAlert, removeAlert, toggleAlert, removeFromWatchlist } = useAppStore();
  const { allPools } = usePools();

  const [newType, setNewType] = useState<AlertType>("apr_spike");
  const [threshold, setThreshold] = useState("20");
  const [poolSearch, setPoolSearch] = useState("");

  const filteredPools = allPools.filter((p) => {
    const q = poolSearch.toLowerCase();
    return q ? `${p.token0.symbol}/${p.token1.symbol} ${p.id}`.toLowerCase().includes(q) : true;
  }).slice(0, 10);

  const watchedPools = watchlist
    .map(({ poolId, chainId }) => allPools.find((p) => p.id === poolId && p.chainId === chainId))
    .filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Alerts & Watchlist
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Create alerts for APR spikes, range exits, and volume surges. Watch your favourite pools.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Watchlist ──────────────────────────────────────────────── */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-4 h-4 text-warn" />
              Watchlist ({watchedPools.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {watchedPools.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Star pools on the Discover page to add them here.
              </p>
            ) : (
              <div className="space-y-2">
                {watchedPools.map((pool) => pool && (
                  <div
                    key={`${pool.chainId}-${pool.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <TokenPair token0={pool.token0} token1={pool.token1} size="sm" />
                      <ChainBadge chainId={pool.chainId} />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-profit tabular-nums">
                        {formatPct(pool.feeAPR ?? 0, 1)} APR
                      </span>
                      <button
                        onClick={() => removeFromWatchlist(pool.id, pool.chainId)}
                        className="text-muted-foreground hover:text-loss transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Create Alert ──────────────────────────────────────────── */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Create Alert
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Alert type */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Alert Type</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ALERT_TYPE_LABELS) as AlertType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setNewType(type)}
                    className={`py-2 px-3 rounded text-xs border transition-all ${
                      newType === type
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {ALERT_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Threshold */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                Threshold ({newType === "apr_spike" ? "% APR" : newType === "volume_surge" ? "USD 24h vol" : "%"})
              </p>
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Pool picker */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Pool</p>
              <Input
                placeholder="Search pool…"
                value={poolSearch}
                onChange={(e) => setPoolSearch(e.target.value)}
                className="text-sm mb-2"
              />
              {poolSearch && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {filteredPools.map((pool) => (
                    <button
                      key={`${pool.chainId}-${pool.id}`}
                      className="w-full flex items-center justify-between p-2 rounded hover:bg-secondary text-left border border-border transition-colors"
                      onClick={() => {
                        addAlert({
                          type: newType,
                          poolId: pool.id,
                          poolLabel: `${pool.token0.symbol}/${pool.token1.symbol}`,
                          chainId: pool.chainId,
                          threshold: parseFloat(threshold) || 0,
                          currentValue: newType === "apr_spike" ? (pool.feeAPR ?? 0) : pool.volumeUSD24h,
                          enabled: true,
                        });
                        setPoolSearch("");
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <TokenPair token0={pool.token0} token1={pool.token1} size="sm" />
                        <ChainBadge chainId={pool.chainId} />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatPct(pool.feeAPR ?? 0, 1)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Active Alerts ───────────────────────────────────────────────── */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Active Alerts ({alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No alerts configured yet.
            </p>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={alert.triggered ? "profit" : "secondary"}
                      className="text-[10px]"
                    >
                      {ALERT_TYPE_LABELS[alert.type]}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{alert.poolLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        <ChainBadge chainId={alert.chainId} size="sm" />
                        {" "}· Threshold: {alert.threshold}
                        {alert.type === "apr_spike" ? "%" : ""}
                        {" "}· Created {formatDate(alert.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAlert(alert.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {alert.enabled
                        ? <ToggleRight className="w-5 h-5 text-primary" />
                        : <ToggleLeft className="w-5 h-5" />
                      }
                    </button>
                    <button
                      onClick={() => removeAlert(alert.id)}
                      className="text-muted-foreground hover:text-loss transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
