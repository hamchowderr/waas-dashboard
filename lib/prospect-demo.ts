import "server-only";

import { cache } from "react";

import type { PublicProspectDemo } from "@/lib/api/types";
import { samplePublicProspectDemo } from "@/lib/api/fixtures";

const CODE = /^p_[A-Za-z0-9_-]{16}$/;

/** JSON from a URL, cached for `revalidate` seconds; null when it can't be had. */
async function fetchJson<T>(url: string | URL, revalidate: number, timeoutMs: number): Promise<T | null> {
  try {
    const response = await fetch(url, { next: { revalidate }, signal: AbortSignal.timeout(timeoutMs) });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

/**
 * A branded demo made for one prospect, from the API's public GET /demos/prospects/{code} (the code is its only
 * key). Null for a wrong code, a demo whose website isn't read yet, or when the API can't be reached.
 */
export const prospectDemo = cache(async (code: string): Promise<PublicProspectDemo | null> => {
  if (!CODE.test(code)) return null;
  if (process.env.WAAS_API_FIXTURES === "1") return samplePublicProspectDemo(code);
  const baseUrl = process.env.WAAS_API_URL;
  return baseUrl ? fetchJson<PublicProspectDemo>(new URL(`/demos/prospects/${code}`, baseUrl), 60, 8_000) : null;
});

/** The store template's site types, each with its Playground blueprint (waas-provisioning-api templates/anypress-store/playground). */
const BLUEPRINTS: Record<string, string> = {
  website: "website",
  bookings: "bookings",
  "online-store": "online-store",
  community: "community",
  everything: "everything",
  highlevel: "highlevel",
  // The old all-in-one "store" type is today's Everything site.
  store: "everything"
};
const RAW = "https://raw.githubusercontent.com/hamchowderr/waas-provisioning-api/main/templates/anypress-store/playground/";

/**
 * The Playground blueprint for a prospect's demo: its site type's, as a new store of that type starts, then what was
 * read from their website and the sample's last part (templates/anypress-store/playground/sample/prospect.php), which
 * gives the site their look and shows only what their website has.
 */
export async function prospectBlueprint(demo: PublicProspectDemo): Promise<Record<string, unknown> | null> {
  const blueprint = await fetchJson<{ steps?: unknown[] } & Record<string, unknown>>(`${RAW}${BLUEPRINTS[demo.siteType] ?? "website"}.json`, 600, 10_000);
  if (!blueprint) return null;
  return {
    ...blueprint,
    steps: [
      ...(blueprint.steps ?? []),
      { step: "writeFile", path: "/wordpress/anypress-prospect.json", data: JSON.stringify(demo) },
      {
        step: "runPHP",
        code: `<?php define('ANYPRESS_SAMPLE_PARTS', ["prospect"]); require '/wordpress/anypress-sample/run.php';`,
        progress: { caption: "Making the demo yours" }
      }
    ]
  };
}
