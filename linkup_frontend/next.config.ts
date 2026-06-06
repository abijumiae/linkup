import type { NextConfig } from "next";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL?.trim()?.replace(/\/$/, "") ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://api.thelinkupzone.com");

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "thelinkupzone.com" }],
        destination: "https://www.thelinkupzone.com/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
      // Dev: proxy WebSocket/polling so realtime works on LAN IP (not only localhost).
      {
        source: "/socket.io",
        destination: `${apiUrl}/socket.io`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${apiUrl}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
