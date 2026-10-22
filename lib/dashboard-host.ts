import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import type { Branding } from "@/lib/api/types";

/**
 * A seller's own dashboard address (the API's docs/branding.md, "Your own dashboard address"), like
 * dashboard.janedesigns.com. There only that storefront's team gets in, and only to that storefront;
 * the API does the narrowing when the address goes along as X-Dashboard-Host.
 */
export interface SellerAddress {
  host: string;
  productName: string | null;
  brand: Branding | null;
}

/** The address this page was opened on, without a port. */
export async function requestHost(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0]!.trim().toLowerCase().replace(/:\d+$/, "");
}

/**
 * The seller whose live dashboard address this request came in on, or null on the platform's own
 * address (or any address the API doesn't know). Asked once per request; the API caches it a minute.
 */
export const sellerAddress = cache(async (): Promise<SellerAddress | null> => {
  const baseUrl = process.env.WAAS_API_URL;
  if (process.env.WAAS_API_FIXTURES === "1" || !baseUrl) return null;
  const host = await requestHost();
  if (!host || host === "localhost" || /^[\d.]+$/.test(host)) return null;
  try {
    const response = await fetch(new URL(`/branding/host/${encodeURIComponent(host)}`, baseUrl), {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5_000)
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { productName: string | null; brand: Branding | null };
    return { host, productName: body.productName, brand: body.brand };
  } catch {
    return null;
  }
});
