"use server";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { AdminApiError } from "@/lib/api/http";
import type { CrmProspect, CrmTarget, ProspectContacts, ProspectCrm, ProspectCrmResult, ProspectSearch, ProspectUsage } from "@/lib/api/types";
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

/** Where this storefront's prospects can go, or null when it can't be read. */
export async function prospectCrm(productId: string): Promise<ProspectCrm | null> {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return null;
  return getAdminApi().prospectCrm(productId).catch(() => null);
}

export type CrmSettingResult = { ok: true; crm: ProspectCrm } | { ok: false; error: string };

/** Saves (or, with null, removes) the seller's HighLevel webhook. */
export async function saveHighLevelWebhook(productId: string, webhook: string | null): Promise<CrmSettingResult> {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return { ok: false, error: "Sign in again to change this." };
  try {
    return { ok: true, crm: await getAdminApi().setProspectHighLevel(productId, webhook ? String(webhook).trim().slice(0, 2000) : null) };
  } catch (err) {
    return { ok: false, error: err instanceof AdminApiError && err.apiMessage ? err.apiMessage : "Something went wrong saving that. Try again." };
  }
}

export type CrmAddResult = { ok: true; result: ProspectCrmResult } | { ok: false; error: string };

/** Sends businesses from the finder into the storefront's FluentCRM, the seller's HighLevel, or both. */
export async function addToCrm(productId: string, prospects: CrmProspect[], group: string | null, targets: CrmTarget[]): Promise<CrmAddResult> {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return { ok: false, error: "Sign in again to add them." };
  const list = (Array.isArray(prospects) ? prospects : []).slice(0, 60);
  const wanted = (Array.isArray(targets) ? targets : []).filter((t): t is CrmTarget => t === "fluentcrm" || t === "highlevel");
  if (!list.length || !wanted.length) return { ok: false, error: "Nothing to add." };
  try {
    return { ok: true, result: await getAdminApi().addProspectsToCrm(productId, list, group ? String(group).slice(0, 80) : null, wanted) };
  } catch (err) {
    return { ok: false, error: err instanceof AdminApiError && err.apiMessage ? err.apiMessage : "Something went wrong adding them. Try again." };
  }
}
