// ─── Chain IDs ────────────────────────────────────────────────────────────────
export type ChainId = 1 | 8453 | 56;

// ─── Token ───────────────────────────────────────────────────────────────────
export interface TokenInfo {
  address: string; // lowercase
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  coingeckoId?: string;
  isLST?: boolean; // Liquid Staking Token flag
}

// ─── Pool ────────────────────────────────────────────────────────────────────
export interface Pool {
  id: string; // pool contract address (lowercase)
  chainId: ChainId;
  token0: TokenInfo;
  token1: TokenInfo;
  /** Fee tier in raw units: 100=0.01%, 500=0.05%, 3000=0.3%, 10000=1% */
  feeTier: number;
  sqrtPriceX96: string;
  tick: number;
  liquidity: string;
  totalValueLockedToken0: number;
  totalValueLockedToken1: number;
  totalValueLockedUSD: number;
  volumeUSD: number;   // all-time
  feesUSD: number;     // all-time
  // Computed from day/hour data
  volumeUSD24h: number;
  feesUSD24h: number;
  volumeUSD7d: number;
  feesUSD7d: number;
  txCount: number;
  token0Price: number; // price of token0 denominated in token1
  token1Price: number;
  // Computed metrics
  feeAPR?: number;        // (fees24h / tvl) * 365
  feeAPR7d?: number;      // (fees7d / tvl) * (365 / 7)
  volumeToTVL?: number;   // volume24h / tvl
  createdAtTimestamp: number;
  poolDayData?: PoolDayData[];
}

export interface PoolDayData {
  date: number; // unix timestamp (start of day)
  volumeUSD: number;
  feesUSD: number;
  tvlUSD: number;
  open: number;
  high: number;
  low: number;
  close: number;
  txCount: number;
}

export interface PoolHourData {
  periodStartUnix: number;
  volumeUSD: number;
  feesUSD: number;
  tvlUSD: number;
  open: number;
  close: number;
}

// ─── Position ────────────────────────────────────────────────────────────────
export interface Position {
  id: string;       // NFT token ID (string for big numbers)
  chainId: ChainId;
  owner: string;
  pool: Pool;
  tickLower: number;
  tickUpper: number;
  liquidity: string;

  // Current amounts (from on-chain or subgraph estimate)
  amount0: number;
  amount1: number;
  amount0USD: number;
  amount1USD: number;
  totalValueUSD: number;

  // Uncollected fees (from contract tokensOwed or subgraph estimate)
  uncollectedFees0: number;
  uncollectedFees1: number;
  uncollectedFeesUSD: number;

  // Historical collected fees (subgraph)
  collectedFees0: number;
  collectedFees1: number;
  collectedFeesUSD: number;

  // Deposit/withdrawal history (subgraph)
  depositedToken0: number;
  depositedToken1: number;
  withdrawnToken0: number;
  withdrawnToken1: number;
  depositedUSD: number;  // approx: deposited amounts at current price
  withdrawnUSD: number;

  // Price range derived from ticks
  priceLower: number;
  priceUpper: number;
  currentPrice: number;

  // Range state
  inRange: boolean;
  rangeProgress: number; // 0–100: where currentTick sits within [tickLower, tickUpper]

  // Computed metrics
  metrics?: PositionMetrics;

  // Metadata
  createdAtTimestamp: number;
  ageInDays: number;
}

export interface PositionMetrics {
  /** (totalFees / cost_basis) annualised */
  feeAPR: number;
  /** Pool PnL = currentValue + totalFees - depositedValue */
  poolPnLUSD: number;
  poolPnLPct: number;
  /** HODL PnL = depositedTokens × currentPrices - depositedValue */
  hodlPnLUSD: number;
  hodlPnLPct: number;
  /** Divergence = poolPnL − hodlPnL  (positive = fees > IL) */
  divergencePnLUSD: number;
  divergencePnLPct: number;
  /** Classic IL % (negative means loss vs hodl) */
  impermanentLoss: number;
  /** Total fees earned (collected + uncollected) in USD */
  totalFeesUSD: number;
  /** (currentValue + fees - deposited) / deposited × 100 */
  roi: number;
  /** Composite 0–100 health score */
  healthScore: number;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────
export type AlertType =
  | "apr_spike"
  | "range_exit"
  | "volume_surge"
  | "fee_collect"
  | "price_above"
  | "price_below";

export interface Alert {
  id: string;
  type: AlertType;
  poolId: string;
  poolLabel: string;
  chainId: ChainId;
  threshold: number;
  currentValue: number;
  triggered: boolean;
  triggeredAt?: number;
  createdAt: number;
  enabled: boolean;
  /** How many times this alert has been re-armed after firing */
  rearmCount?: number;
}

export interface AlertHistoryEntry {
  alertId: string;
  type: AlertType;
  poolLabel: string;
  chainId: ChainId;
  threshold: number;
  firedValue: number;
  firedAt: number;
}

// ─── Notifications ────────────────────────────────────────────────────────────
export interface NotificationSettings {
  telegram: { enabled: boolean; chatId: string };
  email:    { enabled: boolean; address: string };
  whatsapp: { enabled: boolean; number: string }; // E.164: +12125551234
}

export interface WatchlistItem {
  poolId: string;
  chainId: ChainId;
  label?: string;
  addedAt: number;
}

// ─── Filters ─────────────────────────────────────────────────────────────────
export type SortBy =
  | "feeAPR"
  | "feeAPR7d"
  | "tvl"
  | "volume24h"
  | "volumeToTVL"
  | "il";

export interface PoolFilters {
  chainIds: ChainId[];
  feeTiers: number[];
  tokenAddresses: string[];
  minTVL: number;
  minAPR: number;
  searchQuery: string;
  sortBy: SortBy;
  sortDirection: "asc" | "desc";
}

// ─── Range Suggestion ────────────────────────────────────────────────────────
export interface RangeOption {
  lower: number;
  upper: number;
  widthPct: number; // total range width as % of price
  expectedCapitalEfficiency: number; // multiplier vs full-range
}

export interface SuggestedRange {
  tight: RangeOption;   // ±1σ vol
  medium: RangeOption;  // ±2σ vol
  wide: RangeOption;    // ±3σ vol
  currentPrice: number;
  volatility30d: number; // annualised σ
  basedOn: string;
}

// ─── Simulation ──────────────────────────────────────────────────────────────
export interface SimulationParams {
  pool: Pool;
  investmentUSD: number;
  priceLower: number;
  priceUpper: number;
  daysHeld: number;
  /** Multiplier on historical avg daily volume, default 1 */
  volumeFactor?: number;
}

export interface SimulationResult {
  feesEarnedUSD: number;
  feeAPR: number;
  impermanentLoss: number;
  netReturnUSD: number;
  netAPR: number;
  breakEvenDays: number;
  capitalEfficiency: number;
}

// ─── Subgraph raw types ───────────────────────────────────────────────────────
export interface SubgraphPool {
  id: string;
  token0: { id: string; symbol: string; name: string; decimals: string };
  token1: { id: string; symbol: string; name: string; decimals: string };
  feeTier: string;
  sqrtPrice: string;
  tick: string;
  liquidity: string;
  totalValueLockedToken0: string;
  totalValueLockedToken1: string;
  totalValueLockedUSD: string;
  volumeUSD: string;
  feesUSD: string;
  txCount: string;
  token0Price: string;
  token1Price: string;
  createdAtTimestamp: string;
  poolDayData?: SubgraphPoolDayData[];
}

export interface SubgraphPoolDayData {
  date: number;
  volumeUSD: string;
  feesUSD: string;
  tvlUSD: string;
  open: string;
  high: string;
  low: string;
  close: string;
  txCount: string;
}

export interface SubgraphPosition {
  id: string;
  owner: string;
  pool: SubgraphPool;
  tickLower: { tickIdx: string; feeGrowthOutside0X128: string; feeGrowthOutside1X128: string };
  tickUpper: { tickIdx: string; feeGrowthOutside0X128: string; feeGrowthOutside1X128: string };
  liquidity: string;
  depositedToken0: string;
  depositedToken1: string;
  withdrawnToken0: string;
  withdrawnToken1: string;
  collectedFeesToken0: string;
  collectedFeesToken1: string;
  transaction: { timestamp: string };
  feeGrowthInside0LastX128: string;
  feeGrowthInside1LastX128: string;
}

// ─── API response wrappers ────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null;
  error?: string;
  cached?: boolean;
  fetchedAt: number;
}
