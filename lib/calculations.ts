/**
 * Core financial calculations for Uniswap V3 positions.
 *
 * Calculation semantics match Revert.finance:
 *  - Pool PnL  = current value + all fees − deposited value
 *  - HODL PnL  = deposited tokens × current prices − deposited value
 *  - Divergence PnL = Pool PnL − HODL PnL  (fees minus IL)
 *  - Fee APR   = total fees / cost-basis, annualised
 */

import { DAYS_PER_YEAR, Q96 } from "@/lib/constants";
import type { PositionMetrics, SimulationParams, SimulationResult, SuggestedRange } from "@/types";

// ─── Tick / Price conversions ─────────────────────────────────────────────

/** Convert a Uniswap V3 tick to a price ratio (token1 per token0). */
export function tickToPrice(
  tick: number,
  token0Decimals: number,
  token1Decimals: number,
): number {
  // price = 1.0001^tick (adjusted for decimal difference)
  const rawPrice = Math.pow(1.0001, tick);
  return rawPrice * Math.pow(10, token0Decimals - token1Decimals);
}

/** Convert a human-readable price (token1/token0) to the nearest valid tick. */
export function priceToTick(
  price: number,
  token0Decimals: number,
  token1Decimals: number,
  tickSpacing = 60,
): number {
  const adjustedPrice = price / Math.pow(10, token0Decimals - token1Decimals);
  const rawTick = Math.log(adjustedPrice) / Math.log(1.0001);
  const tick = Math.round(rawTick / tickSpacing) * tickSpacing;
  return Math.max(-887272, Math.min(887272, tick));
}

/** Get current price from sqrtPriceX96 string. */
export function sqrtPriceX96ToPrice(
  sqrtPriceX96: string,
  token0Decimals: number,
  token1Decimals: number,
): number {
  const sqrtPrice = Number(BigInt(sqrtPriceX96)) / Number(Q96);
  const rawPrice = sqrtPrice ** 2;
  return rawPrice * Math.pow(10, token0Decimals - token1Decimals);
}

// ─── Liquidity & amounts ──────────────────────────────────────────────────

/**
 * Calculate token amounts from liquidity + price range.
 * Returns amounts denominated in base token units (before decimals).
 */
export function getAmountsFromLiquidity(
  liquidity: bigint,
  sqrtPriceX96: bigint,
  sqrtPriceLowerX96: bigint,
  sqrtPriceUpperX96: bigint,
): { amount0: bigint; amount1: bigint } {
  let amount0 = BigInt(0);
  let amount1 = BigInt(0);

  if (sqrtPriceX96 <= sqrtPriceLowerX96) {
    // Below range: all token0
    amount0 =
      (liquidity * Q96 * (sqrtPriceUpperX96 - sqrtPriceLowerX96)) /
      sqrtPriceLowerX96 /
      sqrtPriceUpperX96;
  } else if (sqrtPriceX96 < sqrtPriceUpperX96) {
    // In range: both tokens
    amount0 =
      (liquidity * Q96 * (sqrtPriceUpperX96 - sqrtPriceX96)) /
      sqrtPriceX96 /
      sqrtPriceUpperX96;
    amount1 = (liquidity * (sqrtPriceX96 - sqrtPriceLowerX96)) / Q96;
  } else {
    // Above range: all token1
    amount1 = (liquidity * (sqrtPriceUpperX96 - sqrtPriceLowerX96)) / Q96;
  }

  return { amount0, amount1 };
}

/** Convert a tick to its sqrtPriceX96 BigInt. */
export function tickToSqrtPriceX96(tick: number): bigint {
  // sqrt(1.0001^tick) * 2^96
  const sqrtPrice = Math.sqrt(Math.pow(1.0001, tick));
  // Use floating point precision — fine for display purposes
  return BigInt(Math.floor(sqrtPrice * Number(Q96)));
}

// ─── Fee APR ──────────────────────────────────────────────────────────────

/**
 * Annualised fee APR.
 * @param feesUSD - USD fees over the period
 * @param tvlUSD  - pool TVL at time of calculation
 * @param days    - length of the period in days
 */
export function calculateFeeAPR(
  feesUSD: number,
  tvlUSD: number,
  days = 1,
): number {
  if (tvlUSD <= 0) return 0;
  return (feesUSD / tvlUSD) * (DAYS_PER_YEAR / days) * 100;
}

// ─── IL / Divergence formulas ─────────────────────────────────────────────

/**
 * Classic Uniswap V2-style impermanent loss formula.
 * Returns a negative percentage (loss), e.g. -5.7 = −5.7% vs holding.
 * @param priceRatio - currentPrice / initialPrice
 */
export function classicIL(priceRatio: number): number {
  if (priceRatio <= 0) return 0;
  return ((2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1) * 100;
}

// ─── Revert-style PnL metrics ─────────────────────────────────────────────

interface RawPositionData {
  /** Current USD value of token0 + token1 in position */
  currentValueUSD: number;
  /** All-time uncollected + collected fees in USD */
  totalFeesUSD: number;
  /** Approximate USD value of tokens at time of deposit */
  depositedUSD: number;
  /** Tokens that have been withdrawn, in USD at current prices */
  withdrawnUSD: number;
  /** Amount of token0 deposited (raw units) */
  depositedToken0: number;
  /** Amount of token1 deposited (raw units) */
  depositedToken1: number;
  /** Current USD price of token0 */
  token0PriceUSD: number;
  /** Current USD price of token1 */
  token1PriceUSD: number;
  /** Position age in days */
  ageInDays: number;
  /** Is position currently in range? */
  inRange: boolean;
  /** 0–100 progress through price range */
  rangeProgress: number;
}

/**
 * Compute all Revert-style metrics for a position.
 *
 * Pool PnL  = (currentValue + totalFees + withdrawnUSD) − depositedUSD
 * HODL PnL  = (depositedToken0 × token0Price + depositedToken1 × token1Price) − depositedUSD
 * Divergence = Pool PnL − HODL PnL   (positive = fees outpaced IL)
 * Fee APR   = totalFees / costBasis * (365 / ageDays) * 100
 */
export function calculatePositionMetrics(data: RawPositionData): PositionMetrics {
  const {
    currentValueUSD,
    totalFeesUSD,
    depositedUSD,
    withdrawnUSD,
    depositedToken0,
    depositedToken1,
    token0PriceUSD,
    token1PriceUSD,
    ageInDays,
    inRange,
    rangeProgress,
  } = data;

  // Protect against division by zero
  const costBasis = depositedUSD > 0 ? depositedUSD : 1;
  const daysElapsed = ageInDays > 0 ? ageInDays : 1;

  // Pool PnL (unrealised + realised)
  const poolPnLUSD = currentValueUSD + totalFeesUSD + withdrawnUSD - depositedUSD;
  const poolPnLPct = (poolPnLUSD / costBasis) * 100;

  // HODL value: what deposited tokens would be worth today if held
  const hodlValueUSD = depositedToken0 * token0PriceUSD + depositedToken1 * token1PriceUSD;
  const hodlPnLUSD = hodlValueUSD - depositedUSD;
  const hodlPnLPct = (hodlPnLUSD / costBasis) * 100;

  // Divergence = how much the LP strategy beat (or lost to) plain HODL
  const divergencePnLUSD = poolPnLUSD - hodlPnLUSD;
  const divergencePnLPct = (divergencePnLUSD / costBasis) * 100;

  // Classic IL (fees excluded, pure price-path loss)
  const impermanentLoss = ((currentValueUSD - hodlValueUSD) / hodlValueUSD) * 100;

  // ROI = absolute return on the deposited capital
  const roi = poolPnLPct;

  // Fee APR (position-specific, not pool-level)
  const feeAPR =
    totalFeesUSD > 0
      ? (totalFeesUSD / costBasis) * (DAYS_PER_YEAR / daysElapsed) * 100
      : 0;

  // Health score: composite
  const healthScore = computeHealthScore({ inRange, rangeProgress, feeAPR, ageInDays });

  return {
    feeAPR,
    poolPnLUSD,
    poolPnLPct,
    hodlPnLUSD,
    hodlPnLPct,
    divergencePnLUSD,
    divergencePnLPct,
    impermanentLoss,
    totalFeesUSD,
    roi,
    healthScore,
  };
}

// ─── Health Score ─────────────────────────────────────────────────────────

interface HealthInput {
  inRange: boolean;
  rangeProgress: number; // 0–100
  feeAPR: number;
  ageInDays: number;
}

/**
 * Composite health score 0–100.
 *  - 40 pts for being in range
 *  - 20 pts for price being near the centre of the range
 *  - 30 pts for fee APR (capped at 200% APR → full 30 pts)
 *  - 10 pts for age (battle-tested: max at 30 days)
 */
export function computeHealthScore({
  inRange,
  rangeProgress,
  feeAPR,
  ageInDays,
}: HealthInput): number {
  let score = 0;

  if (inRange) {
    score += 40;
    // Closer to centre = better
    const centreDistance = Math.abs(50 - rangeProgress) / 50; // 0=centre, 1=edge
    score += 20 * (1 - centreDistance);
  }

  score += Math.min(30, (feeAPR / 200) * 30);
  score += Math.min(10, (ageInDays / 30) * 10);

  return Math.round(Math.max(0, Math.min(100, score)));
}

/** Health score label and colour */
export function healthLabel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "Healthy", color: "text-profit" };
  if (score >= 50) return { label: "Moderate", color: "text-yellow-400" };
  if (score >= 25) return { label: "At Risk", color: "text-warn" };
  return { label: "Critical", color: "text-loss" };
}

// ─── Range Utilization ────────────────────────────────────────────────────

/** Returns 0–100 showing where the current tick sits within [lower, upper]. */
export function calcRangeProgress(
  currentTick: number,
  tickLower: number,
  tickUpper: number,
): number {
  if (currentTick <= tickLower) return 0;
  if (currentTick >= tickUpper) return 100;
  return ((currentTick - tickLower) / (tickUpper - tickLower)) * 100;
}

// ─── Suggested Range Optimizer ────────────────────────────────────────────

/**
 * Suggest tight / medium / wide price ranges based on 30-day historical volatility.
 *
 * Capital efficiency relative to full-range V2:
 *   factor ≈ sqrt(priceUpper/priceLower) / (sqrt(priceUpper/priceLower) − 1)   [simplified]
 */
export function suggestRange(
  currentPrice: number,
  annualisedVolatility: number, // decimal, e.g. 0.60 for 60%
): SuggestedRange {
  const dailyVol = annualisedVolatility / Math.sqrt(DAYS_PER_YEAR);
  const vol30d = dailyVol * Math.sqrt(30);

  const makeOption = (sigma: number) => {
    const lower = currentPrice * Math.exp(-sigma * vol30d);
    const upper = currentPrice * Math.exp(sigma * vol30d);
    const widthPct = ((upper - lower) / currentPrice) * 100;
    // Capital efficiency: fee concentration vs full-range
    const sqrtRatio = Math.sqrt(upper / lower);
    const expectedCapitalEfficiency = sqrtRatio / (sqrtRatio - 1);
    return { lower, upper, widthPct, expectedCapitalEfficiency };
  };

  return {
    tight: makeOption(1),
    medium: makeOption(2),
    wide: makeOption(3),
    currentPrice,
    volatility30d: annualisedVolatility,
    basedOn: "30-day historical price volatility (log-normal model)",
  };
}

// ─── Position Simulator ───────────────────────────────────────────────────

/**
 * Simulate fee earnings for a hypothetical position.
 * Uses pool's average daily fees/TVL ratio to project returns.
 */
export function simulatePosition(params: SimulationParams): SimulationResult {
  const {
    pool,
    investmentUSD,
    priceLower,
    priceUpper,
    daysHeld,
    volumeFactor = 1,
  } = params;

  if (!pool.totalValueLockedUSD || pool.totalValueLockedUSD === 0) {
    return {
      feesEarnedUSD: 0,
      feeAPR: 0,
      impermanentLoss: 0,
      netReturnUSD: 0,
      netAPR: 0,
      breakEvenDays: 0,
      capitalEfficiency: 1,
    };
  }

  // Daily fee rate from pool
  const dailyFeeRate = (pool.feesUSD24h / pool.totalValueLockedUSD) * volumeFactor;

  // Capital efficiency of the range vs full-range
  const sqrtUpper = Math.sqrt(priceUpper);
  const sqrtLower = Math.sqrt(priceLower);
  const sqrtCurrent = Math.sqrt(pool.token0Price || 1);
  let capitalEfficiency = 1;

  if (sqrtLower < sqrtCurrent && sqrtCurrent < sqrtUpper) {
    capitalEfficiency = sqrtCurrent / (sqrtCurrent - sqrtLower);
  }

  // Fees earned by liquidity concentration
  const effectiveRate = dailyFeeRate * capitalEfficiency;
  const feesEarnedUSD = investmentUSD * effectiveRate * daysHeld;
  const feeAPR = calculateFeeAPR(feesEarnedUSD, investmentUSD, daysHeld);

  // Estimate IL at end of hold period using pool volatility
  const il = classicIL(pool.token0Price / (pool.token0Price || 1));
  const ilUSD = investmentUSD * (il / 100);

  const netReturnUSD = feesEarnedUSD + ilUSD; // ilUSD is negative
  const netAPR = (netReturnUSD / investmentUSD) * (DAYS_PER_YEAR / daysHeld) * 100;

  const breakEvenDays =
    il < 0 ? Math.abs(ilUSD) / (feesEarnedUSD / daysHeld) : 0;

  return {
    feesEarnedUSD,
    feeAPR,
    impermanentLoss: il,
    netReturnUSD,
    netAPR,
    breakEvenDays,
    capitalEfficiency,
  };
}

// ─── Volume/TVL ratio ─────────────────────────────────────────────────────

/** Higher = more active pool relative to its size (good for fee earners). */
export function calcVolumeToTVL(volumeUSD24h: number, tvlUSD: number): number {
  if (tvlUSD <= 0) return 0;
  return volumeUSD24h / tvlUSD;
}
