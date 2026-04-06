/**
 * GraphQL client for Uniswap V3 subgraphs.
 * Supports Ethereum, Base, and BNB Chain with optional API-key auth.
 */
import { GraphQLClient } from "graphql-request";
import { SUBGRAPH_URLS } from "@/lib/constants";
import type { ChainId } from "@/types";

function buildClient(chainId: ChainId): GraphQLClient {
  const url = SUBGRAPH_URLS[chainId];
  const apiKey = process.env.GRAPH_API_KEY;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // The Graph decentralised network uses Authorization header
  if (apiKey && url.includes("gateway.thegraph.com")) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  return new GraphQLClient(url, { headers });
}

/** Per-chain GraphQL clients (initialised lazily) */
const clients: Partial<Record<ChainId, GraphQLClient>> = {};

export function getSubgraphClient(chainId: ChainId): GraphQLClient {
  if (!clients[chainId]) {
    clients[chainId] = buildClient(chainId);
  }
  return clients[chainId]!;
}

/**
 * Execute a GraphQL query against a given chain's Uniswap V3 subgraph.
 * Throws on network errors; returns `null` on empty data.
 */
export async function querySubgraph<T>(
  chainId: ChainId,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const client = getSubgraphClient(chainId);
  try {
    return await client.request<T>(query, variables);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Subgraph query failed (chain ${chainId}): ${msg}`);
  }
}

/** Paginate through all results using skip/first. */
export async function paginateSubgraph<T>(
  chainId: ChainId,
  query: string,
  key: string,
  variables?: Record<string, unknown>,
  pageSize = 1000,
): Promise<T[]> {
  const results: T[] = [];
  let skip = 0;

  while (true) {
    const data = await querySubgraph<Record<string, T[]>>(chainId, query, {
      ...variables,
      first: pageSize,
      skip,
    });
    const page = data[key] ?? [];
    results.push(...page);
    if (page.length < pageSize) break;
    skip += pageSize;
  }

  return results;
}
