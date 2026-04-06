/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "tokens.1inch.io" },
      { protocol: "https", hostname: "ethereum-optimism.github.io" },
    ],
  },
  // Enable experimental server actions + PPR when ready
  experimental: {},
  async headers() {
    return [
      {
        // Cache API responses at edge
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "s-maxage=60, stale-while-revalidate=300" },
        ],
      },
    ];
  },
};

export default nextConfig;
