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
  // Each API route sets its own Cache-Control headers
  experimental: {},
};

export default nextConfig;
