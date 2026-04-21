import type { NextConfig } from "next";

const apiInternalUrl = process.env.API_INTERNAL_URL || "http://127.0.0.1:8001";
const allowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS || "localhost,127.0.0.1,192.168.67.190")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiInternalUrl}/api/:path*`,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8001",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8001",
      },
    ],
  },
};

export default nextConfig;
