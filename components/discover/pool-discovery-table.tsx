/**
 * PoolDiscoveryTable — the core of the Discover page.
 *
 * Uses TanStack Table for client-side sorting.
 * Columns: Pool, Chain, TVL, 24h Vol, Fee APR, 7d APR, Vol/TVL, Actions
 */
"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, Telescope, Star, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenPair } from "@/components/shared/token-pair";
import { ChainBadge } from "@/components/shared/chain-badge";
import { FeeTierBadge } from "@/components/shared/fee-tier-badge";
import {
  MetricTooltip,
  METRIC_TOOLTIPS,
} from "@/components/ui/metric-tooltip";
import { SimulatorModal } from "./simulator-modal";
import { usePools } from "@/hooks/use-pools";
import { useAppStore } from "@/store";
import { formatUSD, formatPct, aprClass } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Pool } from "@/types";

// ─── Sort header cell ─────────────────────────────────────────────────────

function SortHeader({
  label,
  tooltip,
  column,
}: {
  label: string;
  tooltip: string;
  column: { getIsSorted: () => false | "asc" | "desc"; toggleSorting: () => void };
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      onClick={column.toggleSorting}
    >
      <MetricTooltip label={label} description={tooltip} className="gap-0">
        <span />
      </MetricTooltip>
      <span className="text-xs">{label}</span>
      {sorted === false && (
        <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-60" />
      )}
      {sorted === "asc" && <ArrowUp className="w-3 h-3 text-primary" />}
      {sorted === "desc" && <ArrowDown className="w-3 h-3 text-primary" />}
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export function PoolDiscoveryTable() {
  const { pools, isLoading, isError } = usePools();
  const { addToWatchlist, removeFromWatchlist, isWatched } = useAppStore();
  const [simPool, setSimPool] = useState<Pool | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "feeAPR", desc: true },
  ]);

  const columns = useMemo<ColumnDef<Pool>[]>(
    () => [
      {
        id: "pool",
        header: "Pool",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <TokenPair
              token0={row.original.token0}
              token1={row.original.token1}
              size="sm"
            />
            <FeeTierBadge feeTier={row.original.feeTier} />
          </div>
        ),
        enableSorting: false,
      },
      {
        id: "chain",
        header: "Chain",
        cell: ({ row }) => <ChainBadge chainId={row.original.chainId} />,
        enableSorting: false,
      },
      {
        accessorKey: "totalValueLockedUSD",
        id: "tvl",
        header: ({ column }) => (
          <SortHeader
            label="TVL"
            tooltip="Total Value Locked — total USD value of all liquidity in this pool."
            column={column}
          />
        ),
        cell: ({ getValue }) => (
          <span className="tabular-nums text-sm">
            {formatUSD(getValue() as number, true)}
          </span>
        ),
      },
      {
        accessorKey: "volumeUSD24h",
        id: "volume24h",
        header: ({ column }) => (
          <SortHeader
            label="24h Vol"
            tooltip="Trading volume over the last 24 hours."
            column={column}
          />
        ),
        cell: ({ getValue }) => (
          <span className="tabular-nums text-sm">
            {formatUSD(getValue() as number, true)}
          </span>
        ),
      },
      {
        accessorKey: "feeAPR",
        id: "feeAPR",
        header: ({ column }) => (
          <SortHeader
            label="Fee APR"
            tooltip={METRIC_TOOLTIPS.feeAPR}
            column={column}
          />
        ),
        cell: ({ getValue }) => {
          const apr = getValue() as number;
          return (
            <span className={cn("tabular-nums font-semibold text-sm", aprClass(apr))}>
              {formatPct(apr, 1)}
            </span>
          );
        },
      },
      {
        accessorKey: "feeAPR7d",
        id: "feeAPR7d",
        header: ({ column }) => (
          <SortHeader
            label="7d APR"
            tooltip={METRIC_TOOLTIPS.feeAPR7d}
            column={column}
          />
        ),
        cell: ({ getValue }) => {
          const apr = (getValue() as number) ?? 0;
          return (
            <span className={cn("tabular-nums text-sm", aprClass(apr))}>
              {formatPct(apr, 1)}
            </span>
          );
        },
      },
      {
        accessorKey: "volumeToTVL",
        id: "volumeToTVL",
        header: ({ column }) => (
          <SortHeader
            label="Vol/TVL"
            tooltip={METRIC_TOOLTIPS.volumeToTVL}
            column={column}
          />
        ),
        cell: ({ getValue }) => {
          const ratio = (getValue() as number) ?? 0;
          return (
            <span className="tabular-nums text-sm text-muted-foreground">
              {ratio.toFixed(3)}×
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const pool = row.original;
          const watched = isWatched(pool.id, pool.chainId);
          return (
            <div className="flex items-center gap-1">
              {/* Watchlist */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (watched) {
                    removeFromWatchlist(pool.id, pool.chainId);
                  } else {
                    addToWatchlist({ poolId: pool.id, chainId: pool.chainId });
                  }
                }}
                title={watched ? "Remove from watchlist" : "Add to watchlist"}
                className={cn(
                  "p-1.5 rounded hover:bg-secondary transition-colors",
                  watched ? "text-warn" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Star className={cn("w-3.5 h-3.5", watched && "fill-warn")} />
              </button>

              {/* Simulate */}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setSimPool(pool);
                }}
              >
                <Play className="w-3 h-3" />
                Simulate
              </Button>

              {/* Open in Uniswap */}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs gap-1 text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    `https://app.uniswap.org/explore/pools/${pool.id}`,
                    "_blank",
                  );
                }}
              >
                Add LP
              </Button>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [isWatched, addToWatchlist, removeFromWatchlist],
  );

  const table = useReactTable({
    data: pools,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-lg border border-border bg-card text-muted-foreground gap-3">
        <Telescope className="w-8 h-8" />
        <p className="text-sm">Failed to load pools. Check your subgraph configuration.</p>
      </div>
    );
  }

  return (
    <>
      {/* Pool count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground py-2">
        {isLoading ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <span>
            {pools.length} pool{pools.length !== 1 ? "s" : ""} matching filters
          </span>
        )}
        <span className="flex items-center gap-1 text-muted-foreground/60">
          <span className="w-2 h-2 rounded-full bg-profit animate-pulse-subtle" />
          Live data
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-border bg-secondary/30">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left font-medium whitespace-nowrap"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {columns.map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-5 w-full max-w-[120px]" />
                        </td>
                      ))}
                    </tr>
                  ))
                : table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border table-row-hover transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {!isLoading && pools.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Telescope className="w-8 h-8" />
            <p className="text-sm">No pools match your current filters.</p>
            <p className="text-xs">Try reducing Min TVL or Min APR.</p>
          </div>
        )}
      </div>

      {/* Simulator modal */}
      <SimulatorModal
        pool={simPool}
        open={!!simPool}
        onClose={() => setSimPool(null)}
      />
    </>
  );
}
