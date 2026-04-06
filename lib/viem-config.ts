/**
 * Viem public clients for on-chain contract reads.
 * Used for reading NonfungiblePositionManager (uncollected fees, position state).
 */
import { createPublicClient, http, type PublicClient } from "viem";
import { mainnet, base, bsc } from "viem/chains";
import { DEFAULT_RPC, NFT_POSITION_MANAGER } from "@/lib/constants";
import type { ChainId } from "@/types";

// ─── Public clients ───────────────────────────────────────────────────────

export const publicClients: Record<ChainId, PublicClient> = {
  1: createPublicClient({
    chain: mainnet,
    transport: http(process.env.NEXT_PUBLIC_ETH_RPC_URL ?? DEFAULT_RPC[1]),
  }) as PublicClient,
  8453: createPublicClient({
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL ?? DEFAULT_RPC[8453]),
  }) as PublicClient,
  56: createPublicClient({
    chain: bsc,
    transport: http(process.env.NEXT_PUBLIC_BNB_RPC_URL ?? DEFAULT_RPC[56]),
  }) as PublicClient,
};

// ─── NonfungiblePositionManager ABI (minimal) ────────────────────────────

export const NFT_PM_ABI = [
  {
    name: "positions",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "nonce", type: "uint96" },
      { name: "operator", type: "address" },
      { name: "token0", type: "address" },
      { name: "token1", type: "address" },
      { name: "fee", type: "uint24" },
      { name: "tickLower", type: "int24" },
      { name: "tickUpper", type: "int24" },
      { name: "liquidity", type: "uint128" },
      { name: "feeGrowthInside0LastX128", type: "uint256" },
      { name: "feeGrowthInside1LastX128", type: "uint256" },
      { name: "tokensOwed0", type: "uint128" },
      { name: "tokensOwed1", type: "uint128" },
    ],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    name: "tokenOfOwnerByIndex",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
] as const;

// ─── Uniswap V3 Pool ABI (minimal) ───────────────────────────────────────

export const POOL_ABI = [
  {
    name: "slot0",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint8" },
      { name: "unlocked", type: "bool" },
    ],
  },
  {
    name: "feeGrowthGlobal0X128",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "feeGrowthGlobal1X128",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "ticks",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tick", type: "int24" }],
    outputs: [
      { name: "liquidityGross", type: "uint128" },
      { name: "liquidityNet", type: "int128" },
      { name: "feeGrowthOutside0X128", type: "uint256" },
      { name: "feeGrowthOutside1X128", type: "uint256" },
      { name: "tickCumulativeOutside", type: "int56" },
      { name: "secondsPerLiquidityOutsideX128", type: "uint160" },
      { name: "secondsOutside", type: "uint32" },
      { name: "initialized", type: "bool" },
    ],
  },
] as const;

// ─── Helper: get all token IDs for an owner across a chain ────────────────

export async function getTokenIdsForOwner(
  chainId: ChainId,
  owner: `0x${string}`,
): Promise<bigint[]> {
  const client = publicClients[chainId];

  const balance = await client.readContract({
    address: NFT_POSITION_MANAGER as `0x${string}`,
    abi: NFT_PM_ABI,
    functionName: "balanceOf",
    args: [owner],
  });

  const tokenIds: bigint[] = [];
  for (let i = BigInt(0); i < balance; i++) {
    const tokenId = await client.readContract({
      address: NFT_POSITION_MANAGER as `0x${string}`,
      abi: NFT_PM_ABI,
      functionName: "tokenOfOwnerByIndex",
      args: [owner, i],
    });
    tokenIds.push(tokenId);
  }

  return tokenIds;
}
