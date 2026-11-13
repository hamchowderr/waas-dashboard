import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is per-request data behind a sign-in, and the root layout reads
  // cookies (Appearance settings), so nothing here benefits from prerendering: render everything at request time.
  cacheComponents: false,
  poweredByHeader: false,
  // The alerts service worker (public/sw.js): always fetched fresh, so a fix reaches every device.
  async headers() {
    return [
      // No other site may show the dashboard in a frame, so its buttons can't be clicked through a disguise.
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
        ]
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" }
        ]
      }
    ];
  },
  // The Sales Kit page reads its playbooks from content/sales-kit at request time.
  outputFileTracingIncludes: {
    "/sell": ["./content/sales-kit/**/*"],
    "/sell/*": ["./content/sales-kit/**/*"],
    "/print/sell": ["./content/sales-kit/**/*"],
  },
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
