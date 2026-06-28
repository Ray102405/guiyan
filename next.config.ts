import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["100.100.119.122"],
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: "http://localhost:2612/:path*",
      },
    ]
  },
};

export default nextConfig;
