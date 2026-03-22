import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [],
  },
  allowedDevOrigins: ['localhost', '192.168.56.1'],
};

export default nextConfig;
