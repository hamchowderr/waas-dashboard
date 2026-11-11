import type { MetadataRoute } from "next";

import { sellerAddress } from "@/lib/dashboard-host";

/**
 * Lets people install the dashboard on a phone or computer, opening in its own window. Public: the
 * browser fetches it without the session cookie, so proxy.ts lets it through. On a seller's own
 * address it carries their name and icon (Branding page), so the installed app is theirs.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const seller = await sellerAddress();
  const name = seller?.brand?.name ?? seller?.productName ?? "AnyPress";
  const icon = seller?.brand?.iconUrl;
  return {
    id: "/",
    name,
    short_name: name,
    description: "Run your websites, stores and storefronts.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: icon
      ? [{ src: icon, sizes: "any", purpose: "any" }]
      : [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
  };
}
