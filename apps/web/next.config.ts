import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @speakpay/shared ships TypeScript source.
  transpilePackages: ["@speakpay/shared"],
  reactStrictMode: true,
};

export default nextConfig;
