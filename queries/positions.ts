/**
 * GraphQL query strings for Uniswap V3 position data.
 * Compatible with the canonical Uniswap V3 subgraph on all three chains.
 */

// ─── Fragments ────────────────────────────────────────────────────────────

const POSITION_POOL_FRAGMENT = /* GraphQL */ `
  fragment PositionPoolFields on Pool {
    id
    token0 { id symbol name decimals }
    token1 { id symbol name decimals }
    feeTier
    sqrtPrice
    tick
    liquidity
    totalValueLockedUSD
    volumeUSD
    feesUSD
    token0Price
    token1Price
    createdAtTimestamp
    poolDayData(first: 8, orderBy: date, orderDirection: desc) {
      date
      volumeUSD
      feesUSD
      tvlUSD
    }
  }
`;

const POSITION_FIELDS_FRAGMENT = /* GraphQL */ `
  fragment PositionFields on Position {
    id
    owner
    liquidity
    depositedToken0
    depositedToken1
    withdrawnToken0
    withdrawnToken1
    collectedFeesToken0
    collectedFeesToken1
    feeGrowthInside0LastX128
    feeGrowthInside1LastX128
    transaction {
      timestamp
    }
    pool {
      ...PositionPoolFields
    }
    tickLower {
      tickIdx
      feeGrowthOutside0X128
      feeGrowthOutside1X128
    }
    tickUpper {
      tickIdx
      feeGrowthOutside0X128
      feeGrowthOutside1X128
    }
  }
  ${POSITION_POOL_FRAGMENT}
`;

// ─── Positions by owner ───────────────────────────────────────────────────

/**
 * Fetch all active positions for a given owner address.
 * Filters out closed positions (liquidity == '0') by default.
 *
 * Variables: { owner: string, first?: number, skip?: number, includeEmpty?: boolean }
 */
export const POSITIONS_BY_OWNER_QUERY = /* GraphQL */ `
  query PositionsByOwner(
    $owner: String!
    $first: Int = 100
    $skip: Int = 0
  ) {
    positions(
      first: $first
      skip: $skip
      where: {
        owner: $owner
        liquidity_gt: "0"
      }
      orderBy: transaction__timestamp
      orderDirection: desc
    ) {
      ...PositionFields
    }
  }
  ${POSITION_FIELDS_FRAGMENT}
`;

/** Include closed positions too (liquidity == 0) for full history. */
export const ALL_POSITIONS_BY_OWNER_QUERY = /* GraphQL */ `
  query AllPositionsByOwner(
    $owner: String!
    $first: Int = 200
    $skip: Int = 0
  ) {
    positions(
      first: $first
      skip: $skip
      where: { owner: $owner }
      orderBy: transaction__timestamp
      orderDirection: desc
    ) {
      ...PositionFields
    }
  }
  ${POSITION_FIELDS_FRAGMENT}
`;

// ─── Single position by token ID ──────────────────────────────────────────

export const POSITION_BY_ID_QUERY = /* GraphQL */ `
  query PositionById($id: ID!) {
    position(id: $id) {
      ...PositionFields
    }
  }
  ${POSITION_FIELDS_FRAGMENT}
`;

// ─── Top open positions (Discover feature — reads top LPs) ───────────────

/**
 * Top open positions by deposited USD value on preferred pools.
 * Used by the "Discover" scanner to show what successful LPs are doing.
 *
 * Variables: { poolIds: string[], first: number, minLiquidity: string }
 */
export const TOP_POSITIONS_BY_POOL_QUERY = /* GraphQL */ `
  query TopPositionsByPool(
    $poolIds: [String!]!
    $first: Int = 50
    $skip: Int = 0
  ) {
    positions(
      first: $first
      skip: $skip
      orderBy: depositedToken0
      orderDirection: desc
      where: {
        pool_in: $poolIds
        liquidity_gt: "0"
      }
    ) {
      ...PositionFields
    }
  }
  ${POSITION_FIELDS_FRAGMENT}
`;

// ─── Position snapshots (for backtesting / tracking) ─────────────────────

export const POSITION_SNAPSHOTS_QUERY = /* GraphQL */ `
  query PositionSnapshots(
    $positionId: String!
    $first: Int = 100
  ) {
    positionSnapshots(
      first: $first
      where: { position: $positionId }
      orderBy: timestamp
      orderDirection: asc
    ) {
      timestamp
      liquidity
      collectedFeesToken0
      collectedFeesToken1
      depositedToken0
      depositedToken1
      feeGrowthInside0LastX128
      feeGrowthInside1LastX128
    }
  }
`;
