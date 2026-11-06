import type { MetadataRoute } from "next";

/**
 * Lets people install the dashboard on a phone or computer, opening in its own window. Public: the
 * browser fetches it without the session cookie, so proxy.ts lets it through.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AnyPress",
    short_name: "AnyPress",
    description: "Run your websites, stores and storefronts.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
