/**
 * Zustand global store for PoolGuard.
 * Handles wallet address override, watchlist, alerts, pool filters,
 * anonymous identity, and data export / import.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Alert, AlertType, AlertHistoryEntry, ChainId, Pool, PoolFilters, WatchlistItem, TokenInfo, NotificationSettings } from "@/types";
import { SUPPORTED_CHAINS, FEE_TIERS } from "@/lib/constants";

// ─── Anonymous ID helper ─────────────────────────────────────────────────────

function generateAnonymousId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {}
  // Fallback for older browsers
  return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

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
  /** Reset a triggered alert so it can fire again. */
  rearmAlert: (id: string) => void;
  /** Check current pool data against all enabled alerts and mark triggered ones. */
  triggerAlerts: (pools: Pool[]) => void;

  // Alert history log (last 100 fires)
  alertHistory: AlertHistoryEntry[];
  clearAlertHistory: () => void;

  // Custom token selections (per-chain) for the TokenPicker
  customTokens: (TokenInfo & { chainId: ChainId })[];
  addCustomToken: (token: TokenInfo & { chainId: ChainId }) => void;
  removeCustomToken: (address: string, chainId: ChainId) => void;
  clearCustomTokens: () => void;

  // Anonymous identity — no PII, generated once and persisted
  anonymousId: string;

  // Data backup / restore (no server needed)
  exportData: () => string;
  importData: (json: string) => boolean;

  // Notification delivery settings — persisted locally
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (partial: Partial<NotificationSettings>) => void;

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
              id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              triggered: false,
              createdAt: Date.now() / 1000,
              enabled: alertData.enabled ?? true,
            },
          ],
        })),
      removeAlert: (id) =>
        set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
      toggleAlert: (id) =>
        set((s) => ({
          alerts: s.alerts.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
        })),
      rearmAlert: (id) =>
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id
              ? { ...a, triggered: false, triggeredAt: undefined, rearmCount: (a.rearmCount ?? 0) + 1 }
              : a,
          ),
        })),
      triggerAlerts: (pools) =>
        set((s) => {
          const now = Date.now() / 1000;
          const newHistory: AlertHistoryEntry[] = [];
          const updatedAlerts = s.alerts.map((a) => {
            if (!a.enabled || a.triggered) return a;
            const pool = pools.find((p) => p.id === a.poolId && p.chainId === a.chainId);
            if (!pool) return a;

            let currentValue: number;
            if (a.type === "apr_spike" || a.type === "range_exit") {
              currentValue = pool.feeAPR ?? 0;
            } else if (a.type === "volume_surge") {
              currentValue = pool.volumeUSD24h;
            } else if (a.type === "fee_collect") {
              currentValue = pool.feesUSD24h;
            } else if (a.type === "price_above" || a.type === "price_below") {
              // token0Price = price of token0 in token1 units
              currentValue = pool.token0Price;
            } else {
              currentValue = 0;
            }

            const fires =
              a.type === "range_exit" || a.type === "price_below"
                ? currentValue < a.threshold
                : currentValue >= a.threshold;

            if (!fires) return { ...a, currentValue };

            newHistory.push({
              alertId: a.id,
              type: a.type,
              poolLabel: a.poolLabel,
              chainId: a.chainId,
              threshold: a.threshold,
              firedValue: currentValue,
              firedAt: now,
            });
            return { ...a, triggered: true, triggeredAt: now, currentValue };
          });

          const combined = [...s.alertHistory, ...newHistory].slice(-100);
          return { alerts: updatedAlerts, alertHistory: combined };
        }),

      // ── Alert history ────────────────────────────────────────────────
      alertHistory: [],
      clearAlertHistory: () => set({ alertHistory: [] }),

      // ── Custom tokens ─────────────────────────────────────────────────
      customTokens: [],
      addCustomToken: (token) =>
        set((s) => {
          const already = s.customTokens.some(
            (t) => t.address === token.address && t.chainId === token.chainId,
          );
          return already ? s : { customTokens: [...s.customTokens, token] };
        }),
      removeCustomToken: (address, chainId) =>
        set((s) => ({
          customTokens: s.customTokens.filter(
            (t) => !(t.address === address && t.chainId === chainId),
          ),
        })),
      clearCustomTokens: () => set({ customTokens: [] }),

      // ── Anonymous identity ────────────────────────────────────────────
      anonymousId: generateAnonymousId(),

      // ── Export / Import ───────────────────────────────────────────────
      exportData: () => {
        const s = get();
        return JSON.stringify({
          version: 1,
          anonymousId: s.anonymousId,
          watchlist: s.watchlist,
          alerts: s.alerts,
          alertHistory: s.alertHistory,
          customTokens: s.customTokens,
          overrideAddress: s.overrideAddress,
          filters: s.filters,
        }, null, 2);
      },
      importData: (json: string) => {
        try {
          const data = JSON.parse(json);
          if (typeof data !== "object" || data === null || data.version !== 1) return false;
          set((s) => ({
            ...(Array.isArray(data.watchlist) ? { watchlist: data.watchlist } : {}),
            ...(Array.isArray(data.alerts) ? { alerts: data.alerts } : {}),
            ...(Array.isArray(data.alertHistory) ? { alertHistory: data.alertHistory } : {}),
            ...(Array.isArray(data.customTokens) ? { customTokens: data.customTokens } : {}),
            ...(data.overrideAddress !== undefined ? { overrideAddress: data.overrideAddress } : {}),
            ...(data.filters && typeof data.filters === "object"
              ? { filters: { ...s.filters, ...data.filters } }
              : {}),
          }));
          return true;
        } catch {
          return false;
        }
      },

      // ── Notifications ──────────────────────────────────────────────────
      notificationSettings: {
        telegram: { enabled: false, chatId: "" },
        email:    { enabled: false, address: "" },
        whatsapp: { enabled: false, number: "" },
      },
      updateNotificationSettings: (partial) =>
        set((s) => ({ notificationSettings: { ...s.notificationSettings, ...partial } })),

      // ── UI ───────────────────────────────────────────────────────────────
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: "poolguard-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        anonymousId: s.anonymousId,
        overrideAddress: s.overrideAddress,
        filters: s.filters,
        watchlist: s.watchlist,
        alerts: s.alerts,
        alertHistory: s.alertHistory,
        customTokens: s.customTokens,
        sidebarCollapsed: s.sidebarCollapsed,
        notificationSettings: s.notificationSettings,
      }),
    },
  ),
);
