/**
 * Zustand global store for PoolGuard.
 * Handles wallet address override, watchlist, alerts, and pool filters.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Alert, ChainId, PoolFilters, WatchlistItem } from "@/types";
import { SUPPORTED_CHAINS, FEE_TIERS } from "@/lib/constants";

interface AppState {
  // Wallet / address override (user can paste any address)
  overrideAddress: string | null;
  setOverrideAddress: (address: string | null) => void;

  // Pool filters on the Discover page
  filters: PoolFilters;
  setFilters: (partial: Partial<PoolFilters>) => void;
  resetFilters: () => void;

  // Watchlist
  watchlist: WatchlistItem[];
  addToWatchlist: (item: Omit<WatchlistItem, "addedAt">) => void;
  removeFromWatchlist: (poolId: string, chainId: ChainId) => void;
  isWatched: (poolId: string, chainId: ChainId) => boolean;

  // Alerts
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, "id" | "createdAt" | "triggered">) => void;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;

  // UI state
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const DEFAULT_FILTERS: PoolFilters = {
  chainIds: [...SUPPORTED_CHAINS],
  feeTiers: [...FEE_TIERS],
  tokenAddresses: [],
  minTVL: 50_000,
  minAPR: 0,
  searchQuery: "",
  sortBy: "feeAPR",
  sortDirection: "desc",
};

let alertCounter = 0;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Address override ────────────────────────────────────────────────
      overrideAddress: null,
      setOverrideAddress: (address) => set({ overrideAddress: address }),

      // ── Filters ─────────────────────────────────────────────────────────
      filters: DEFAULT_FILTERS,
      setFilters: (partial) =>
        set((s) => ({ filters: { ...s.filters, ...partial } })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      // ── Watchlist ────────────────────────────────────────────────────────
      watchlist: [],
      addToWatchlist: (item) =>
        set((s) => {
          if (s.watchlist.some((w) => w.poolId === item.poolId && w.chainId === item.chainId)) {
            return s;
          }
          return { watchlist: [...s.watchlist, { ...item, addedAt: Date.now() / 1000 }] };
        }),
      removeFromWatchlist: (poolId, chainId) =>
        set((s) => ({
          watchlist: s.watchlist.filter(
            (w) => !(w.poolId === poolId && w.chainId === chainId),
          ),
        })),
      isWatched: (poolId, chainId) =>
        get().watchlist.some((w) => w.poolId === poolId && w.chainId === chainId),

      // ── Alerts ────────────────────────────────────────────────────────────
      alerts: [],
      addAlert: (alertData) =>
        set((s) => ({
          alerts: [
            ...s.alerts,
            {
              ...alertData,
              id: `alert-${++alertCounter}-${Date.now()}`,
              triggered: false,
              createdAt: Date.now() / 1000,
              enabled: true,
            },
          ],
        })),
      removeAlert: (id) =>
        set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
      toggleAlert: (id) =>
        set((s) => ({
          alerts: s.alerts.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
        })),

      // ── UI ───────────────────────────────────────────────────────────────
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: "poolguard-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist user preferences, not transient UI state
      partialize: (s) => ({
        overrideAddress: s.overrideAddress,
        filters: s.filters,
        watchlist: s.watchlist,
        alerts: s.alerts,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    },
  ),
);
