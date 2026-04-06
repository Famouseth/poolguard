import type { TokenInfo, ChainId } from "@/types";

// ─── Supported chains ──────────────────────────────────────────────────────
export const SUPPORTED_CHAINS: ChainId[] = [1, 8453, 56];

export const CHAIN_NAMES: Record<ChainId, string> = {
  1: "Ethereum",
  8453: "Base",
  56: "BNB Chain",
};

export const CHAIN_SHORT: Record<ChainId, string> = {
  1: "ETH",
  8453: "Base",
  56: "BNB",
};

export const CHAIN_COLORS: Record<ChainId, string> = {
  1: "#627EEA",
  8453: "#0052FF",
  56: "#F3BA2F",
};

// ─── Uniswap V3 contract addresses ────────────────────────────────────────
/** NonfungiblePositionManager — same address on all Uniswap V3 chains */
export const NFT_POSITION_MANAGER = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";

export const UNISWAP_V3_FACTORY: Record<ChainId, string> = {
  1: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  8453: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
  56: "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F",
};

// ─── Fee tiers ─────────────────────────────────────────────────────────────
/** Raw fee-tier values used in Uniswap V3 */
export const FEE_TIERS = [100, 500, 3000, 10000] as const;
export type FeeTier = (typeof FEE_TIERS)[number];

export const FEE_TIER_LABELS: Record<FeeTier, string> = {
  100: "0.01%",
  500: "0.05%",
  3000: "0.30%",
  10000: "1.00%",
};

// Tick spacing per fee tier
export const TICK_SPACING: Record<FeeTier, number> = {
  100: 1,
  500: 10,
  3000: 60,
  10000: 200,
};

// ─── Token addresses ────────────────────────────────────────────────────────
// All addresses lowercase for consistent comparisons

/** Ethereum Mainnet (chainId: 1) */
export const ETH_TOKENS: Record<string, TokenInfo> = {
  WETH: {
    address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    coingeckoId: "weth",
  },
  USDC: {
    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    coingeckoId: "usd-coin",
  },
  USDT: {
    address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    coingeckoId: "tether",
  },
  USDS: {
    address: "0xdc035d45d973e3ec169d2276ddab16f1e407384f",
    symbol: "USDS",
    name: "USDS Stablecoin",
    decimals: 18,
    coingeckoId: "usds",
  },
  WBTC: {
    address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    decimals: 8,
    coingeckoId: "wrapped-bitcoin",
  },
  cbBTC: {
    address: "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf",
    symbol: "cbBTC",
    name: "Coinbase Wrapped BTC",
    decimals: 8,
    coingeckoId: "coinbase-wrapped-btc",
  },
  cbETH: {
    address: "0xbe9895146f7af43049ca1c1ae358b0541ea49704",
    symbol: "cbETH",
    name: "Coinbase Wrapped Staked ETH",
    decimals: 18,
    coingeckoId: "coinbase-wrapped-staked-eth",
    isLST: true,
  },
  XAUT: {
    address: "0x68749665ff8d2d112fa859aa293f07a622782f38",
    symbol: "XAUT",
    name: "Tether Gold",
    decimals: 6,
    coingeckoId: "tether-gold",
  },
  PAXG: {
    address: "0x45804880de22913dafe09f4980848ece6ecbaf78",
    symbol: "PAXG",
    name: "PAX Gold",
    decimals: 18,
    coingeckoId: "pax-gold",
  },
  wstETH: {
    address: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
    symbol: "wstETH",
    name: "Wrapped liquid staked Ether 2.0",
    decimals: 18,
    coingeckoId: "wrapped-steth",
    isLST: true,
  },
  stETH: {
    address: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
    symbol: "stETH",
    name: "Liquid staked Ether 2.0",
    decimals: 18,
    coingeckoId: "staked-ether",
    isLST: true,
  },
  rETH: {
    address: "0xae78736cd615f374d3085123a210448e74fc6393",
    symbol: "rETH",
    name: "Rocket Pool ETH",
    decimals: 18,
    coingeckoId: "rocket-pool-eth",
    isLST: true,
  },
};

/** Base (chainId: 8453) */
export const BASE_TOKENS: Record<string, TokenInfo> = {
  WETH: {
    address: "0x4200000000000000000000000000000000000006",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    coingeckoId: "weth",
  },
  USDC: {
    address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    coingeckoId: "usd-coin",
  },
  USDT: {
    address: "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    coingeckoId: "tether",
  },
  USDS: {
    address: "0x820c137fa70c8691f0e44dc420a5e53c168921dc",
    symbol: "USDS",
    name: "USDS Stablecoin",
    decimals: 18,
    coingeckoId: "usds",
  },
  cbBTC: {
    address: "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf",
    symbol: "cbBTC",
    name: "Coinbase Wrapped BTC",
    decimals: 8,
    coingeckoId: "coinbase-wrapped-btc",
  },
  cbETH: {
    address: "0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22",
    symbol: "cbETH",
    name: "Coinbase Wrapped Staked ETH",
    decimals: 18,
    coingeckoId: "coinbase-wrapped-staked-eth",
    isLST: true,
  },
  wstETH: {
    address: "0xc1cba3fcea344f92d9239c08c0568f6f2f0ee452",
    symbol: "wstETH",
    name: "Wrapped liquid staked Ether 2.0",
    decimals: 18,
    coingeckoId: "wrapped-steth",
    isLST: true,
  },
  rETH: {
    address: "0xb6fe221fe9eef5aba221c348ba20a1bf5e73624c",
    symbol: "rETH",
    name: "Rocket Pool ETH",
    decimals: 18,
    coingeckoId: "rocket-pool-eth",
    isLST: true,
  },
};

/** BNB Chain (chainId: 56) */
export const BNB_TOKENS: Record<string, TokenInfo> = {
  WBNB: {
    address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
    symbol: "WBNB",
    name: "Wrapped BNB",
    decimals: 18,
    coingeckoId: "wbnb",
  },
  WETH: {
    address: "0x2170ed0880ac9a755fd29b2688956bd959f933f8",
    symbol: "ETH",
    name: "Ethereum Token",
    decimals: 18,
    coingeckoId: "ethereum",
  },
  USDC: {
    address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 18,
    coingeckoId: "usd-coin",
  },
  USDT: {
    address: "0x55d398326f99059ff775485246999027b3197955",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 18,
    coingeckoId: "tether",
  },
  BTCB: {
    address: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
    symbol: "BTCB",
    name: "BTCB Token",
    decimals: 18,
    coingeckoId: "bitcoin-bep2",
  },
};

/** Quick lookup: all preferred token addresses per chain (lowercase) */
export const PREFERRED_TOKENS: Record<ChainId, string[]> = {
  1: Object.values(ETH_TOKENS).map((t) => t.address),
  8453: Object.values(BASE_TOKENS).map((t) => t.address),
  56: Object.values(BNB_TOKENS).map((t) => t.address),
};

/** Token map: address → info, per chain */
export const TOKEN_MAP: Record<ChainId, Record<string, TokenInfo>> = {
  1: Object.fromEntries(Object.values(ETH_TOKENS).map((t) => [t.address, t])),
  8453: Object.fromEntries(Object.values(BASE_TOKENS).map((t) => [t.address, t])),
  56: Object.fromEntries(Object.values(BNB_TOKENS).map((t) => [t.address, t])),
};

// ─── Subgraph configuration ──────────────────────────────────────────────────
export const SUBGRAPH_URLS: Record<ChainId, string> = {
  1: process.env.SUBGRAPH_URL_ETH ??
    "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3",
  8453: process.env.SUBGRAPH_URL_BASE ??
    "https://api.studio.thegraph.com/query/48211/uniswap-v3-base/version/latest",
  56: process.env.SUBGRAPH_URL_BNB ??
    "https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-bsc",
};

// ─── RPC defaults (public fallbacks, override via .env) ────────────────────
export const DEFAULT_RPC: Record<ChainId, string> = {
  1: "https://cloudflare-eth.com",
  8453: "https://mainnet.base.org",
  56: "https://bsc-dataseed.binance.org",
};

// ─── Misc constants ─────────────────────────────────────────────────────────
export const MAX_UINT128 = BigInt("340282366920938463463374607431768211455");
// Pre-computed to avoid BigInt ** operator which requires ES2016+ target support in tsc
export const Q96 = BigInt("79228162514264337593543950336"); // 2^96
export const Q128 = BigInt("340282366920938463463374607431768211456"); // 2^128

export const SECONDS_PER_DAY = 86400;
export const DAYS_PER_YEAR = 365;

/** Minimum TVL to show a pool in discovery results */
export const MIN_POOL_TVL_USD = 10_000;

/** Default revalidation for subgraph data (seconds) */
export const CACHE_TTL = 60;
