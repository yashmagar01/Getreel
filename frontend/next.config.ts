import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [],
  },
  allowedDevOrigins: ['localhost', '[IP_ADDRESS]'],
};

export default nextConfig;
