import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  headers: async () => [
    {
      source: "/",
      headers: [
        {
          key: "Cache-Control",
          value: "no-cache, no-store, must-revalidate",
        },
      ],
    },
    {
      source: "/manifest.webmanifest",
      headers: [
        {
          key: "Cache-Control",
          value: "no-cache, no-store, must-revalidate",
        },
      ],
    },
  ],
};

export default nextConfig;