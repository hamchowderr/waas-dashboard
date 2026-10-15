import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is per-request data behind a sign-in, and the root layout reads
  // cookies (Appearance settings), so nothing here benefits from prerendering: render everything at request time.
  cacheComponents: false,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
