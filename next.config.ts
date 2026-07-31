import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  
  devIndicators: false,
  // Safe cache: long-lived textures, short icon cache, always revalidate HTML/JS.
  headers: async () => [
    {
      source: "/:path*.:ext(jpg|jpeg|webp|gif|geojson|woff2?)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      source: "/:path*.:ext(png|svg|ico)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=604800, stale-while-revalidate=86400",
        },
      ],
    },
    {
      source: "/:path*.:ext(js|css|webmanifest|json|html)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
      ],
    },
    {
      source: "/",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
      ],
    },
  ],
};

export default nextConfig;
