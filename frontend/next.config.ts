import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const cleanBackendUrl = BACKEND_URL.replace(/\/$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "127.0.0.1:3000", "localhost:3000"],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${cleanBackendUrl}/api/v1/:path*`,
      },
      {
        source: "/ws/v1/:path*",
        destination: `${cleanBackendUrl}/ws/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
