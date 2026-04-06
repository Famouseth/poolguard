/**
 * GeckoTerminal API client — free, no API key required.
 * https://www.geckoterminal.com/dex-api
 *
 * Used as the primary data source for Uniswap V3 pool data after
 * The Graph deprecated its free hosted service.
 */

import type { ChainId, Pool, TokenInfo } from "@/types";
import { calculateFeeAPR, calcVolumeToTVL } from "@/lib/calculations";
import { TOKEN_MAP } from "@/lib/constants";

// ─── Constants ────────────────────────────────────────────────────────────

const BASE_URL = "https://api.geckoterminal.com/api/v2";

/**
 * GeckoTerminal network identifiers for each chain.
 * Ethereum: "eth", Base: "base", BNB Chain: "bsc"
 */
export const GECKO_NETWORK: Record<ChainId, string> = {
  1: "eth",
  8453: "base",
  56: "bsc",
};

/**
 * GeckoTerminal DEX slug for Uniswap V3 on Ethereum — confirmed working.
 * For other chains we search by token and filter by dex.id.
 */
const UNISWAP_V3_DEX_ETH = "uniswap_v3";

/**
 * Anchor token addresses per chain.
 * Used as the query pivot when no custom tokens are specified.
 * Always lowercase.
 */
export const GECKO_ANCHOR_TOKENS: Record<ChainId, string[]> = {
  1: [
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
  ],
  8453: [
    "0x4200000000000000000000000000000000000006", // WETH on Base
    "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC on Base
    "0xc1cba3fcea344f92d9239c08c0568f6f2f0ee452", // wstETH on Base
    "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf", // cbBTC on Base
    "0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22", // cbETH on Base
    "0x04c0599ae5a44757c0af6f9ec3b93da8976c150a", // weETH on Base
  ],
  56: [
    "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", // WBNB
    "0x55d398326f99059ff775485246999027b3197955", // USDT on BSC
  ],
};

/**
 * Per-chain set of whitelisted token addresses (Aave V3-grade / blue-chip only).
 * Pools where either token is NOT in this set are filtered out.
 * Built lazily from TOKEN_MAP at first call.
 */
let _allowedAddrs: Record<ChainId, Set<string>> | null = null;
function getAllowedAddrs(): Record<ChainId, Set<string>> {
  if (!_allowedAddrs) {
    _allowedAddrs = {
      1: new Set(Object.keys(TOKEN_MAP[1])),
      8453: new Set(Object.keys(TOKEN_MAP[8453])),
      56: new Set(Object.keys(TOKEN_MAP[56])),
    };
  }
  return _allowedAddrs;
}

// ─── GeckoTerminal response types ─────────────────────────────────────────

interface GeckoTokenAttr {
  address: string;
  name: string;
  symbol: string;
  decimals: string | number;
  image_url?: string | null;
  price_usd?: string | null;
  total_reserve_in_usd?: string | null;
  volume_usd?: string | null;
  fdv_usd?: string | null;
}

interface GeckoPoolAttr {
  name: string;
  address: string;
  pool_created_at?: string | null;
  base_token_price_usd?: string | null;
  quote_token_price_usd?: string | null;
  token_price_usd?: string | null;
  reserve_in_usd?: string | null;
  price_change_percentage?: { h24?: string };
  transactions?: {
    h24?: { buys?: number; sells?: number; buyers?: number; sellers?: number };
  };
  volume_usd?: {
    m5?: string;
    h1?: string;
    h6?: string;
    h24?: string;
  };
}

interface GeckoPoolRelationships {
  base_token: { data: { id: string; type: string } };
  quote_token: { data: { id: string; type: string } };
  dex: { data: { id: string; type: string } };
}

export interface GeckoPool {
  id: string;
  type: "pool";
  attributes: GeckoPoolAttr;
  relationships: GeckoPoolRelationships;
}

interface GeckoTokenItem {
  id: string;
  type: "token";
  attributes: GeckoTokenAttr;
}

interface GeckoResponse<T> {
  data: T;
  included?: GeckoTokenItem[];
}

// ─── HTTP client ──────────────────────────────────────────────────────────

async function geckoFetch<T>(path: string): Promise<{ data: T; included: GeckoTokenItem[] }> {
  const url = `${BASE_URL}${path}`;
  // 12-second timeout prevents a slow chain from freezing the entire request
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json;version=20230302" },
      next: { revalidate: 60 }, // Next.js server-side cache
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 429) {
    // Rate limited — return empty gracefully
    return { data: [] as unknown as T, included: [] };
  }
  if (!res.ok) {
    throw new Error(`GeckoTerminal ${res.status}: ${url}`);
  }

  const json: GeckoResponse<T> = await res.json();
  return { data: json.data ?? ([] as unknown as T), included: json.included ?? [] };
}

// ─── Pool transformation ──────────────────────────────────────────────────

/** Extract token address (lowercase) from a GeckoTerminal token ID like "eth_0x..." */
function tokenIdToAddress(id: string): string {
  return id.substring(id.indexOf("_") + 1).toLowerCase();
}

/** Parse Uniswap fee tier from pool name (e.g. "WETH / USDC 0.05%") → 500 */
function parseFieBps(name: string): number {
  const m = name.match(/([0-9.]+)%/);
  if (!m) return 3000;
  return Math.round(parseFloat(m[1]) * 10_000);
}

function buildTokenInfo(item: GeckoTokenItem | undefined, fallbackAddress: string): TokenInfo {
  if (!item) {
    return {
      address: fallbackAddress,
      symbol: "???",
      name: "Unknown",
      decimals: 18,
    };
  }
  return {
    address: item.attributes.address.toLowerCase(),
    symbol: item.attributes.symbol,
    name: item.attributes.name,
    decimals: parseInt(String(item.attributes.decimals)) || 18,
    logoURI: item.attributes.image_url ?? undefined,
  };
}

export function geckoPoolToPool(
  p: GeckoPool,
  chainId: ChainId,
  tokenMap: Map<string, GeckoTokenItem>,
): Pool {
  const attr = p.attributes;
  const tvlUSD = parseFloat(attr.reserve_in_usd ?? "0");
  const volumeUSD24h = parseFloat(attr.volume_usd?.h24 ?? "0");
  const feeTier = parseFieBps(attr.name);

  // fees = volume × (feeTier / 1_000_000)  — e.g. 500/1_000_000 = 0.0005 = 0.05%
  const feeRate = feeTier / 1_000_000;
  const feesUSD24h = volumeUSD24h * feeRate;
  // Approximate 7d from 24h
  const volumeUSD7d = volumeUSD24h * 7;
  const feesUSD7d = feesUSD24h * 7;

  const feeAPR = calculateFeeAPR(feesUSD24h, tvlUSD, 1);
  const feeAPR7d = calculateFeeAPR(feesUSD7d, tvlUSD, 7);
  const volumeToTVL = calcVolumeToTVL(volumeUSD24h, tvlUSD);

  const baseId = p.relationships.base_token.data.id;
  const quoteId = p.relationships.quote_token.data.id;
  const baseTokenObj = tokenMap.get(baseId);
  const quoteTokenObj = tokenMap.get(quoteId);

  const token0 = buildTokenInfo(baseTokenObj, tokenIdToAddress(baseId));
  const token1 = buildTokenInfo(quoteTokenObj, tokenIdToAddress(quoteId));

  const txH24 = attr.transactions?.h24;
  const txCount = (txH24?.buys ?? 0) + (txH24?.sells ?? 0);

  const token0Price = parseFloat(attr.base_token_price_usd ?? "0");
  const token1Price = parseFloat(attr.quote_token_price_usd ?? "0");
  const createdAt = attr.pool_created_at
    ? Math.floor(new Date(attr.pool_created_at).getTime() / 1000)
    : 0;

  return {
    id: attr.address.toLowerCase(),
    chainId,
    token0,
    token1,
    feeTier,
    sqrtPriceX96: "0",
    tick: 0,
    liquidity: "0",
    totalValueLockedToken0: 0,
    totalValueLockedToken1: 0,
    totalValueLockedUSD: tvlUSD,
    volumeUSD: 0,
    feesUSD: 0,
    volumeUSD24h,
    feesUSD24h,
    volumeUSD7d,
    feesUSD7d,
    txCount,
    token0Price,
    token1Price,
    feeAPR,
    feeAPR7d,
    volumeToTVL,
    createdAtTimestamp: createdAt,
    poolDayData: [], // GeckoTerminal doesn't provide day-level historical data in list endpoint
  };
}

// ─── Main exports ─────────────────────────────────────────────────────────

/**
 * Fetch top Uniswap V3 pools for a given chain.
 * - ETH: uses the direct DEX endpoint (most efficient)
 * - Base / BSC: queries by anchor token, then filters for Uniswap V3 pools
 *
 * `customAddresses` overrides the default anchor token list.
 */
export async function getUniswapPools(
  chainId: ChainId,
  customAddresses?: string[],
): Promise<Pool[]> {
  const network = GECKO_NETWORK[chainId];
  const tokenMap = new Map<string, GeckoTokenItem>();
  const rawPools: GeckoPool[] = [];

  try {
    if (chainId === 1 && !customAddresses?.length) {
      // ETH + no custom filter → use DEX endpoint (faster, confirmed working)
      const pages = await Promise.allSettled([
        geckoFetch<GeckoPool[]>(
          `/networks/eth/dexes/${UNISWAP_V3_DEX_ETH}/pools?include=base_token,quote_token&page=1`,
        ),
        geckoFetch<GeckoPool[]>(
          `/networks/eth/dexes/${UNISWAP_V3_DEX_ETH}/pools?include=base_token,quote_token&page=2`,
        ),
      ]);

      for (const p of pages) {
        if (p.status === "fulfilled") {
          rawPools.push(...(p.value.data ?? []));
          for (const t of p.value.included ?? []) tokenMap.set(t.id, t);
        }
      }
    } else {
      // Base, BSC, or custom token filter — query by token address
      const addresses = customAddresses?.length
        ? customAddresses
        : GECKO_ANCHOR_TOKENS[chainId] ?? [];

      const fetches = await Promise.allSettled(
        addresses.map((addr) =>
          geckoFetch<GeckoPool[]>(
            `/networks/${network}/tokens/${addr}/pools?include=base_token,quote_token&page=1`,
          ),
        ),
      );

      for (const f of fetches) {
        if (f.status === "fulfilled") {
          // Filter for Uniswap V3 pools only
          const uniPools = (f.value.data ?? []).filter((p) =>
            p.relationships.dex.data.id.toLowerCase().includes("uniswap"),
          );
          rawPools.push(...uniPools);
          for (const t of f.value.included ?? []) tokenMap.set(t.id, t);
        }
      }
    }
  } catch (err) {
    console.error(`[geckoterminal] getUniswapPools chain ${chainId}:`, err);
    return [];
  }

  // Deduplicate by pool address
  const seen = new Set<string>();
  const unique = rawPools.filter((p) => {
    const addr = p.attributes.address.toLowerCase();
    if (seen.has(addr)) return false;
    seen.add(addr);
    return true;
  });

  return unique
    .map((p) => geckoPoolToPool(p, chainId, tokenMap))
    .filter((p) => {
      if (p.totalValueLockedUSD <= 0) return false;
      // When the user has selected custom tokens, trust their choice and show all results.
      // Otherwise enforce the blue-chip whitelist: both tokens must be Aave V3-grade.
      if (customAddresses?.length) return true;
      const allowed = getAllowedAddrs()[chainId];
      return allowed.has(p.token0.address) && allowed.has(p.token1.address);
    });
}

/**
 * Search for tokens by symbol/name or address prefix.
 * Returns tokens that appear in Uniswap V3 pools.
 */
export async function searchTokens(
  query: string,
  chainId: ChainId,
): Promise<(TokenInfo & { chainId: ChainId; tvlUSD: number })[]> {
  const network = GECKO_NETWORK[chainId];
  const isAddress = query.startsWith("0x") && query.length >= 6;

  try {
    const { data, included } = await geckoFetch<GeckoPool[]>(
      `/search/pools?query=${encodeURIComponent(query)}&network=${network}&include=base_token,quote_token&page=1`,
    );

    // Build token map from included
    const tokenMap = new Map<string, GeckoTokenItem>();
    for (const t of included) tokenMap.set(t.id, t);

    // Collect unique tokens from matching pools (filter Uniswap V3)
    const seen = new Set<string>();
    const results: (TokenInfo & { chainId: ChainId; tvlUSD: number })[] = [];

    const pools = (data ?? []).filter((p: GeckoPool) =>
      p.relationships.dex.data.id.toLowerCase().includes("uniswap"),
    );

    for (const pool of pools) {
      for (const tokenRef of [
        pool.relationships.base_token.data,
        pool.relationships.quote_token.data,
      ]) {
        const addr = tokenIdToAddress(tokenRef.id);
        if (seen.has(addr)) continue;

        // For address search, only return tokens matching the query prefix
        if (isAddress && !addr.startsWith(query.toLowerCase())) continue;

        const tokenObj = tokenMap.get(tokenRef.id);
        if (!tokenObj) continue;

        const sym = tokenObj.attributes.symbol.toLowerCase();
        const name = tokenObj.attributes.name.toLowerCase();
        const q = query.toLowerCase();

        // For symbol search, filter for relevance
        if (!isAddress && !sym.includes(q) && !name.includes(q)) continue;

        seen.add(addr);
        results.push({
          address: addr,
          symbol: tokenObj.attributes.symbol,
          name: tokenObj.attributes.name,
          decimals: parseInt(String(tokenObj.attributes.decimals)) || 18,
          chainId,
          tvlUSD: parseFloat(tokenObj.attributes.total_reserve_in_usd ?? "0"),
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}
