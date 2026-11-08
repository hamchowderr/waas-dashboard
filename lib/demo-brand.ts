import "server-only";

import { cache } from "react";

import type { DemoBrand } from "@/lib/api/types";
import { sampleDemoBrand } from "@/lib/api/fixtures";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A seller's (product id) or reseller's demo page look, from the API's public GET /branding/demo/{id}. Null for an id
 * that is neither, or when the API can't be reached; the page then answers "not found" rather than showing anyone's
 * brand by mistake.
 */
export const demoBrand = cache(async (id: string): Promise<DemoBrand | null> => {
  if (!UUID.test(id)) return null;
  if (process.env.WAAS_API_FIXTURES === "1") return sampleDemoBrand(id.toLowerCase());
  const baseUrl = process.env.WAAS_API_URL;
  if (!baseUrl) return null;
  try {
    const response = await fetch(new URL(`/branding/demo/${id.toLowerCase()}`, baseUrl), {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5_000)
    });
    return response.ok ? ((await response.json()) as DemoBrand) : null;
  } catch {
    return null;
  }
});
