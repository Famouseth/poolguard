"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  Plus,
  Trash2,
  Star,
  ToggleLeft,
  ToggleRight,
  Copy,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Eye,
  HardDrive,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenPair } from "@/components/shared/token-pair";
import { ChainBadge } from "@/components/shared/chain-badge";
import { useAppStore } from "@/store";
import { usePools } from "@/hooks/use-pools";
import { formatUSD, formatPct, formatDate, aprClass, cn } from "@/lib/utils";
import type { AlertType } from "@/types";

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  apr_spike: "APR Spike",
  range_exit: "Range Exit",
  volume_surge: "Volume Surge",
  fee_collect: "Fee Collect",
};

const ALERT_TYPE_DESC: Record<AlertType, string> = {
  apr_spike: "Triggers when APR exceeds this threshold (%)",
  range_exit: "Triggers when APR drops below this threshold (%)",
  volume_surge: "Triggers when 24h volume exceeds this threshold (USD)",
  fee_collect: "Triggers when 24h fees exceed this threshold (USD)",
};

export default function AlertsPage() {
  const {
    alerts,
    watchlist,
    addAlert,
    removeAlert,
    toggleAlert,
    removeFromWatchlist,
    triggerAlerts,
    exportData,
    importData,
    anonymousId,
  } = useAppStore();
  const { allPools, isLoading } = usePools();

  const [newType, setNewType] = useState<AlertType>("apr_spike");
  const [threshold, setThreshold] = useState("20");
  const [poolSearch, setPoolSearch] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);

  // Auto-check alerts whenever live pool data arrives
  useEffect(() => {
    if (allPools?.length) {
      triggerAlerts(allPools);
    }
  }, [allPools, triggerAlerts]);

  const filteredPools = (allPools ?? [])
    .filter((p) => {
      const q = poolSearch.toLowerCase();
      return q
        ? `${p.token0.symbol}/${p.token1.symbol} ${p.id}`.toLowerCase().includes(q)
        : true;
    })
    .slice(0, 8);

  const watchedPools = watchlist
    .map(({ poolId, chainId }) =>
      allPools?.find((p) => p.id === poolId && p.chainId === chainId),
    )
    .filter(Boolean);

  const getAlertCount = (poolId: string) =>
    alerts.filter((a) => a.poolId === poolId).length;

  const triggeredCount = alerts.filter((a) => a.triggered && a.enabled).length;

  function handleCopyId() {
    navigator.clipboard.writeText(anonymousId).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    });
  }

  function handleExport() {
    const data = exportData();
    navigator.clipboard.writeText(data).then(() => {
      setCopiedExport(true);
      setTimeout(() => setCopiedExport(false), 2500);
    });
  }

  function handleImport() {
    setImportError("");
    setImportSuccess(false);
    const ok = importData(importText.trim());
    if (ok) {
      setImportSuccess(true);
      setImportText("");
      setTimeout(() => {
        setImportOpen(false);
        setImportSuccess(false);
      }, 1800);
    } else {
      setImportError(
        'Invalid backup. Paste the full exported JSON (should start with "{").',
      );
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Alerts &amp; Watchlist
            {triggeredCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wide">
                {triggeredCount} triggered
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track favourite pools and get alerted on APR spikes, volume surges, and more.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-secondary/60 rounded-full px-3 py-1.5 shrink-0">
          <HardDrive className="w-3 h-3" />
          Saved locally · no sign-in needed
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Watchlist ──────────────────────────────────────────────────── */}
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="w-4 h-4 text-warn fill-warn" />
              Watchlist
              <span className="text-muted-foreground font-normal text-sm">
                ({watchedPools.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && watchlist.length > 0 ? (
              <div className="space-y-2">
                {watchlist.slice(0, 4).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : watchedPools.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Star className="w-8 h-8 mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No pools watched yet.</p>
                <p className="text-xs text-muted-foreground">
                  Star pools on the{" "}
                  <Link href="/discover" className="text-primary underline">
                    Discover page
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {watchedPools.map(
                  (pool) =>
                    pool && (
                      <div
                        key={`${pool.chainId}-${pool.id}`}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-secondary/40 transition-colors"
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <TokenPair
                              token0={pool.token0}
                              token1={pool.token1}
                              size="sm"
                            />
                            <ChainBadge chainId={pool.chainId} />
                            {getAlertCount(pool.id) > 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                                {getAlertCount(pool.id)} alert
                                {getAlertCount(pool.id) > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground tabular-nums">
                            <span className={cn("font-semibold", aprClass(pool.feeAPR ?? 0))}>
                              {formatPct(pool.feeAPR ?? 0, 1)} APR
                            </span>
                            <span>TVL {formatUSD(pool.totalValueLockedUSD, true)}</span>
                            <span>Vol {formatUSD(pool.volumeUSD24h, true)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <Link
                            href={`/explorer?pool=${pool.id}&chain=${pool.chainId}`}
                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded"
                            title="Open in Explorer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => removeFromWatchlist(pool.id, pool.chainId)}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"
                            title="Remove from watchlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ),
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Create Alert ──────────────────────────────────────────────── */}
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
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
                    className={cn(
                      "py-2 px-3 rounded-lg text-xs border transition-all text-left",
                      newType === type
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:bg-secondary/40",
                    )}
                  >
                    <span className="font-medium">{ALERT_TYPE_LABELS[type]}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                {ALERT_TYPE_DESC[newType]}
              </p>
            </div>

            {/* Threshold */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                Threshold
                {newType === "apr_spike" || newType === "range_exit"
                  ? " (% APR)"
                  : " (USD)"}
              </p>
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="text-sm"
                min={0}
                placeholder={
                  newType === "volume_surge" || newType === "fee_collect"
                    ? "e.g. 50000"
                    : "e.g. 20"
                }
              />
            </div>

            {/* Pool picker */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Select Pool</p>
              <Input
                placeholder="Search by token or address…"
                value={poolSearch}
                onChange={(e) => setPoolSearch(e.target.value)}
                className="text-sm"
              />
              {poolSearch && (
                <div className="mt-1.5 max-h-44 overflow-y-auto rounded-lg border border-border bg-card/90">
                  {isLoading ? (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      Loading pools…
                    </div>
                  ) : filteredPools.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      No pools found.
                    </div>
                  ) : (
                    filteredPools.map((pool) => (
                      <button
                        key={`${pool.chainId}-${pool.id}`}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary transition-colors text-left border-b border-border/40 last:border-0"
                        onClick={() => {
                          const val = parseFloat(threshold) || 0;
                          addAlert({
                            type: newType,
                            poolId: pool.id,
                            poolLabel: `${pool.token0.symbol}/${pool.token1.symbol}`,
                            chainId: pool.chainId,
                            threshold: val,
                            currentValue:
                              newType === "apr_spike" || newType === "range_exit"
                                ? pool.feeAPR ?? 0
                                : pool.volumeUSD24h,
                            enabled: true,
                          });
                          setPoolSearch("");
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <TokenPair
                            token0={pool.token0}
                            token1={pool.token1}
                            size="sm"
                          />
                          <ChainBadge chainId={pool.chainId} />
                        </div>
                        <div className="text-right">
                          <p className={cn("text-xs font-medium tabular-nums", aprClass(pool.feeAPR ?? 0))}>
                            {formatPct(pool.feeAPR ?? 0, 1)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">APR</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Active Alerts ───────────────────────────────────────────────── */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-4 h-4 text-primary" />
            Active Alerts
            <span className="text-muted-foreground font-normal text-sm">
              ({alerts.length})
            </span>
            {triggeredCount > 0 && (
              <Badge variant="destructive" className="text-[10px] ml-1">
                {triggeredCount} triggered
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Bell className="w-8 h-8 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No alerts configured yet.</p>
              <p className="text-xs text-muted-foreground">
                Use the form above to create your first alert.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => {
                const livePool = allPools?.find(
                  (p) => p.id === alert.poolId && p.chainId === alert.chainId,
                );
                const liveValue = livePool
                  ? alert.type === "apr_spike" || alert.type === "range_exit"
                    ? livePool.feeAPR ?? 0
                    : alert.type === "volume_surge"
                    ? livePool.volumeUSD24h
                    : livePool.feesUSD24h
                  : null;
                const isTriggered = alert.triggered && alert.enabled;

                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex items-start justify-between p-3 rounded-lg border transition-colors gap-3",
                      isTriggered
                        ? "border-destructive/40 bg-destructive/5"
                        : alert.enabled
                        ? "border-border"
                        : "border-border/30 opacity-55",
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isTriggered ? (
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      ) : (
                        <Bell className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{alert.poolLabel}</span>
                        <ChainBadge chainId={alert.chainId} size="sm" />
                        <Badge
                          variant={isTriggered ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {ALERT_TYPE_LABELS[alert.type]}
                        </Badge>
                        {isTriggered && (
                          <span className="text-[10px] font-bold text-destructive uppercase tracking-wide">
                            ⚠ Triggered
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground flex-wrap">
                        <span>
                          Threshold:{" "}
                          <span className="text-foreground tabular-nums font-medium">
                            {alert.threshold}
                            {alert.type === "apr_spike" || alert.type === "range_exit"
                              ? "%"
                              : " USD"}
                          </span>
                        </span>
                        {liveValue !== null && (
                          <span>
                            Now:{" "}
                            <span className={cn("tabular-nums font-medium", aprClass(
                              alert.type === "volume_surge" || alert.type === "fee_collect"
                                ? 10
                                : liveValue,
                            ))}>
                              {alert.type === "volume_surge" || alert.type === "fee_collect"
                                ? formatUSD(liveValue, true)
                                : formatPct(liveValue, 1)}
                            </span>
                          </span>
                        )}
                        <span>Created {formatDate(alert.createdAt)}</span>
                        {alert.triggeredAt && (
                          <span className="text-destructive">
                            Fired {formatDate(alert.triggeredAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {livePool && (
                        <Link
                          href={`/explorer?pool=${livePool.id}&chain=${livePool.chainId}`}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded"
                          title="View pool in Explorer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      <button
                        onClick={() => toggleAlert(alert.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        title={alert.enabled ? "Disable alert" : "Enable alert"}
                      >
                        {alert.enabled ? (
                          <ToggleRight className="w-5 h-5 text-primary" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => removeAlert(alert.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded"
                        title="Delete alert"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Your Data ───────────────────────────────────────────────────── */}
      <Card className="glass border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="w-4 h-4 text-muted-foreground" />
            Your Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            PoolGuard stores your watchlist, alerts, and preferences entirely in{" "}
            <strong className="text-foreground/70">your browser</strong> — no account or
            email required. Use the backup feature to save and restore your data on
            another browser or device. Your anonymous ID is generated locally and never
            sent anywhere.
          </p>

          {/* Anonymous ID */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Your anonymous ID</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-secondary rounded px-3 py-2 font-mono truncate text-muted-foreground">
                {anonymousId}
              </code>
              <button
                onClick={handleCopyId}
                className="shrink-0 p-2 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                title="Copy ID"
              >
                {copiedId ? (
                  <CheckCircle className="w-4 h-4 text-profit" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Export / Import buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={handleExport}
            >
              <Download className="w-3.5 h-3.5" />
              {copiedExport ? "Copied to clipboard!" : "Export Backup"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={() => {
                setImportOpen((v) => !v);
                setImportError("");
                setImportSuccess(false);
              }}
            >
              <Upload className="w-3.5 h-3.5" />
              Import Backup
            </Button>
          </div>

          {/* Import panel */}
          {importOpen && (
            <div className="space-y-2 pt-1">
              <textarea
                className="w-full h-28 text-xs font-mono bg-secondary rounded-lg p-2.5 border border-border resize-none text-muted-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/40"
                placeholder={`Paste your exported JSON backup here…\n{\n  "version": 1,\n  ...\n}`}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              {importError && (
                <p className="text-xs text-destructive flex items-start gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {importError}
                </p>
              )}
              {importSuccess && (
                <p className="text-xs text-profit flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Data restored successfully!
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={!importText.trim() || importSuccess}
                >
                  Restore
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImportOpen(false);
                    setImportText("");
                    setImportError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
