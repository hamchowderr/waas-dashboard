"use server";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { AdminApiError } from "@/lib/api/http";
import type { ProspectContacts, ProspectSearch, ProspectUsage } from "@/lib/api/types";
import type { Report } from "@/lib/website-check";
import { CheckError, checkWebsite, findContacts } from "@/lib/website-check-fetch";

export type CheckResult = { ok: true; report: Report } | { ok: false; error: string };

/** Runs the website check on a prospect's site for a signed-in seller. */
export async function checkProspectSite(url: string): Promise<CheckResult> {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return { ok: false, error: "Sign in again to run a check." };
  try {
    return { ok: true, report: await checkWebsite(String(url).slice(0, 500)) };
  } catch (err) {
    return { ok: false, error: err instanceof CheckError ? err.message : "Something went wrong checking that website. Try again." };
  }
}

export type ProspectResult = { ok: true; search: ProspectSearch } | { ok: false; error: string; usage?: ProspectUsage };

/** This storefront's prospect finder searches this month, or null when they can't be read. */
export async function prospectUsage(productId: string): Promise<ProspectUsage | null> {
  return getAdminApi().prospectUsage(productId).catch(() => null);
}

/** One prospect finder search for the storefront, counted against its month. */
export async function findProspects(productId: string, query: string, location: string, pageToken?: string): Promise<ProspectResult> {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return { ok: false, error: "Sign in again to search." };
  const api = getAdminApi();
  try {
    return { ok: true, search: await api.searchProspects(productId, String(query).slice(0, 100), String(location).slice(0, 100), pageToken ? String(pageToken).slice(0, 2000) : undefined) };
  } catch (err) {
    const known = err instanceof AdminApiError ? err : null;
    return {
      ok: false,
      error: known?.apiMessage ?? "Something went wrong searching. Try again.",
      usage: known?.status === 429 ? ((await api.prospectUsage(productId).catch(() => null)) ?? undefined) : undefined
    };
  }
}

/** Emails, contact pages and social profiles from up to 20 prospects' own websites, a few at a time. */
export async function prospectContacts(urls: string[]): Promise<Record<string, ProspectContacts>> {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return {};
  const list = [...new Set((Array.isArray(urls) ? urls : []).map((u) => String(u).slice(0, 500)))].slice(0, 20);
  const out: Record<string, ProspectContacts> = {};
  let next = 0;
  await Promise.all(
    Array.from({ length: 5 }, async () => {
      while (next < list.length) {
        const url = list[next++]!;
        out[url] = await findContacts(url);
      }
    })
  );
  return out;
}
