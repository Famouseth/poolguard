/**
 * GraphQL query strings for Uniswap V3 pool data.
 * Compatible with the canonical Uniswap V3 subgraph schema on all three chains.
 */

// ─── Fragment ─────────────────────────────────────────────────────────────

export const POOL_DAY_DATA_FRAGMENT = /* GraphQL */ `
  fragment PoolDayDataFields on PoolDayData {
    date
    volumeUSD
    feesUSD
    tvlUSD
    open
    high
    low
    close
    txCount
  }
`;

export const POOL_FIELDS_FRAGMENT = /* GraphQL */ `
  fragment PoolFields on Pool {
    id
    token0 {
      id
      symbol
      name
      decimals
    }
    token1 {
      id
      symbol
      name
      decimals
    }
    feeTier
    sqrtPrice
    tick
    liquidity
    totalValueLockedToken0
    totalValueLockedToken1
    totalValueLockedUSD
    volumeUSD
    feesUSD
    txCount
    token0Price
    token1Price
    createdAtTimestamp
  }
`;

// ─── Top Pools Query ──────────────────────────────────────────────────────

/**
 * Fetch the top pools by TVL that contain any of the preferred tokens.
 * Pass `token_in` as an array of lowercase token addresses.
 *
 * Variables: { token0_in: string[], token1_in: string[], first: number, skip: number }
 */
export const TOP_POOLS_QUERY = /* GraphQL */ `
  query TopPools(
    $token0_in: [String!]!
    $token1_in: [String!]!
    $first: Int = 50
    $skip: Int = 0
    $minTVL: BigDecimal = "10000"
    $orderBy: Pool_orderBy = totalValueLockedUSD
    $orderDirection: OrderDirection = desc
  ) {
    pools(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: {
        token0_in: $token0_in
        token1_in: $token1_in
        totalValueLockedUSD_gte: $minTVL
        liquidity_gt: "0"
      }
    ) {
      ...PoolFields
      poolDayData(first: 8, orderBy: date, orderDirection: desc) {
        ...PoolDayDataFields
      }
    }
  }
  ${POOL_FIELDS_FRAGMENT}
  ${POOL_DAY_DATA_FRAGMENT}
`;

/**
 * Alternative query: match pools where EITHER token0 OR token1 is in the list.
 * The Graph doesn't support OR in where clauses directly; we query twice and merge client-side.
 */
export const POOLS_BY_TOKEN0_QUERY = /* GraphQL */ `
  query PoolsByToken0(
    $token0_in: [String!]!
    $first: Int = 100
    $skip: Int = 0
    $minTVL: BigDecimal = "10000"
  ) {
    pools(
      first: $first
      skip: $skip
      orderBy: totalValueLockedUSD
      orderDirection: desc
      where: {
        token0_in: $token0_in
        totalValueLockedUSD_gte: $minTVL
        liquidity_gt: "0"
      }
    ) {
      ...PoolFields
      poolDayData(first: 8, orderBy: date, orderDirection: desc) {
        ...PoolDayDataFields
      }
    }
  }
  ${POOL_FIELDS_FRAGMENT}
  ${POOL_DAY_DATA_FRAGMENT}
`;

export const POOLS_BY_TOKEN1_QUERY = /* GraphQL */ `
  query PoolsByToken1(
    $token1_in: [String!]!
    $first: Int = 100
    $skip: Int = 0
    $minTVL: BigDecimal = "10000"
  ) {
    pools(
      first: $first
      skip: $skip
      orderBy: totalValueLockedUSD
      orderDirection: desc
      where: {
        token1_in: $token1_in
        totalValueLockedUSD_gte: $minTVL
        liquidity_gt: "0"
      }
    ) {
      ...PoolFields
      poolDayData(first: 8, orderBy: date, orderDirection: desc) {
        ...PoolDayDataFields
      }
    }
  }
  ${POOL_FIELDS_FRAGMENT}
  ${POOL_DAY_DATA_FRAGMENT}
`;

// ─── Single Pool Query ────────────────────────────────────────────────────

/** Fetch a single pool by ID with historical day and hour data. */
export const POOL_DETAIL_QUERY = /* GraphQL */ `
  query PoolDetail($poolId: ID!) {
    pool(id: $poolId) {
      ...PoolFields
      poolDayData(first: 30, orderBy: date, orderDirection: desc) {
        ...PoolDayDataFields
      }
      poolHourData(first: 48, orderBy: periodStartUnix, orderDirection: desc) {
        periodStartUnix
        volumeUSD
        feesUSD
        tvlUSD
        open
        close
      }
    }
  }
  ${POOL_FIELDS_FRAGMENT}
  ${POOL_DAY_DATA_FRAGMENT}
`;

// ─── Global Stats Query ───────────────────────────────────────────────────

/** Protocol-level totals (for dashboard header stats). */
export const GLOBAL_STATS_QUERY = /* GraphQL */ `
  query GlobalStats {
    factories(first: 1) {
      txCount
      totalVolumeUSD
      totalFeesUSD
      totalValueLockedUSD
      poolCount
    }
  }
`;

// ─── Token by address ─────────────────────────────────────────────────────

export const TOKEN_QUERY = /* GraphQL */ `
  query Token($id: ID!) {
    token(id: $id) {
      id
      symbol
      name
      decimals
      totalValueLockedUSD
      volumeUSD
      txCount
    }
  }
`;

// ─── Token Search ─────────────────────────────────────────────────────────

/** Search tokens by symbol (case-insensitive). Used by the TokenPicker UI. */
export const TOKEN_SEARCH_BY_SYMBOL_QUERY = /* GraphQL */ `
  query TokenSearchBySymbol($query: String!, $first: Int = 20) {
    tokens(
      where: { symbol_contains_nocase: $query }
      first: $first
      orderBy: totalValueLockedUSD
      orderDirection: desc
    ) {
      id
      symbol
      name
      decimals
      totalValueLockedUSD
    }
  }
`;

/** Search tokens by address prefix. Used when user pastes an address. */
export const TOKEN_SEARCH_BY_ADDRESS_QUERY = /* GraphQL */ `
  query TokenSearchByAddress($id: String!, $first: Int = 10) {
    tokens(
      where: { id_contains: $id }
      first: $first
      orderBy: totalValueLockedUSD
      orderDirection: desc
    ) {
      id
      symbol
      name
      decimals
      totalValueLockedUSD
    }
  }
`;
