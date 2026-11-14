"use server";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { AdminApiError } from "@/lib/api/http";
import type { CrmProspect, CrmTarget, NewProspectDemo, ProspectContacts, ProspectDemoList, ProspectReadUsage, ProspectCrm, ProspectCrmResult, ProspectAutomationInput, ProspectAutomations, ProspectMailbox, ProspectMailboxInput, ProspectSearch, ProspectUsage } from "@/lib/api/types";
import { findContacts } from "@/lib/website-check-fetch";

const failed = (err: unknown, fallback: string) => (err instanceof AdminApiError && err.apiMessage ? err.apiMessage : fallback);

export type ProspectListResult = { ok: true; list: ProspectDemoList } | { ok: false; error: string };

/** The storefront's prospects, each with its website check and branded demo once its website is read. */
export async function prospectList(productId: string): Promise<ProspectListResult> {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return { ok: false, error: "Sign in again to see your prospects." };
  try {
    return { ok: true, list: await getAdminApi().prospectDemos(String(productId)) };
  } catch (err) {
    return { ok: false, error: failed(err, "Your prospects couldn't be loaded. Try again.") };
  }
}

export type ReadResult = { ok: true; added: number; skipped: string[]; reads: ProspectReadUsage } | { ok: false; error: string };

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

/**
 * Adds businesses to the storefront's prospects and reads their websites: the website check, what kind of site it
 * is and a branded demo, one read each from the month's allowance. From the finder (with what it found) or typed in.
 */
export async function readWebsites(productId: string, businesses: { company: string; website: string; placeId?: string | null; details?: CrmProspect | null }[]): Promise<ReadResult> {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return { ok: false, error: "Sign in again to read websites." };
  const list = (Array.isArray(businesses) ? businesses : []).slice(0, 60).flatMap((b): NewProspectDemo[] => {
    const company = str(b?.company, 200);
    const website = str(b?.website, 2000);
    if (!company || !website) return [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the id and name travel as placeId and company
    const { id, name, ...details } = b.details ?? ({} as CrmProspect);
    return [{ company, website, placeId: str(b.placeId, 300) ?? null, details: b.details ? details : null }];
  });
  if (!list.length) return { ok: false, error: "Enter the business's name and website." };
  try {
    const { created, skipped, reads } = await getAdminApi().addProspectDemos(String(productId), list);
    return { ok: true, added: created.length, skipped: skipped.map((s) => s.company), reads };
  } catch (err) {
    return { ok: false, error: failed(err, "Those websites couldn't be read. Try again.") };
  }
}

export type ProspectActionResult = { ok: true } | { ok: false; error: string };

/** Reads a prospect's website again (one read), for a site that changed or a read that failed. */
export async function readAgain(productId: string, id: string): Promise<ProspectActionResult> {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return { ok: false, error: "Sign in again." };
  try {
    await getAdminApi().readProspectDemo(String(productId), String(id));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: failed(err, "That website couldn't be read again. Try again.") };
  }
}

/** Removes a prospect, its check and its demo; the demo link stops working. */
export async function removeProspect(productId: string, id: string): Promise<ProspectActionResult> {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return { ok: false, error: "Sign in again." };
  try {
    await getAdminApi().deleteProspectDemo(String(productId), String(id));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: failed(err, "That prospect couldn't be removed. Try again.") };
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

/** The seller's own mailbox for emails to prospects, or null when it can't be read. */
export async function prospectMailbox(productId: string): Promise<ProspectMailbox | null> {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return null;
  return getAdminApi().prospectMailbox(productId).catch(() => null);
}

export type MailboxResult = { ok: true; mailbox: ProspectMailbox } | { ok: false; error: string };

/** Saves (or, with null, disconnects) the mailbox; the storefront then signs in to it. */
export async function saveMailbox(productId: string, input: ProspectMailboxInput | null): Promise<MailboxResult> {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return { ok: false, error: "Sign in again to change this." };
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const mailbox: ProspectMailboxInput | null = input
    ? {
        host: text(input.host, 253),
        port: Number(input.port) || 587,
        user: text(input.user, 254),
        // App passwords are shown with spaces; Google and Microsoft take them either way.
        pass: typeof input.pass === "string" ? input.pass.slice(0, 500) : "",
        from: text(input.from, 254),
        name: text(input.name, 100),
        daily: Math.round(Number(input.daily) || 30)
      }
    : null;
  try {
    return { ok: true, mailbox: await getAdminApi().setProspectMailbox(productId, mailbox) };
  } catch (err) {
    return { ok: false, error: err instanceof AdminApiError && err.apiMessage ? err.apiMessage : "Something went wrong saving that. Try again." };
  }
}

/** The group outreach plans on the storefront's FluentCRM, or null when they can't be read. */
export async function prospectAutomations(productId: string): Promise<ProspectAutomations | null> {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return null;
  return getAdminApi().prospectAutomations(productId).catch(() => null);
}

export type AutomationResult = { ok: true; automations: ProspectAutomations } | { ok: false; error: string };

/** Adds a group's outreach emails to the storefront's FluentCRM as a draft automation. */
export async function addOutreachAutomation(productId: string, input: ProspectAutomationInput): Promise<AutomationResult> {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return { ok: false, error: "Sign in again to add it." };
  const emails = (Array.isArray(input?.emails) ? input.emails : []).slice(0, 10).map((e) => ({
    day: Math.round(Number(e.day)) || 1,
    subject: String(e.subject ?? "").slice(0, 200),
    body: String(e.body ?? "").slice(0, 5000)
  }));
  try {
    return {
      ok: true,
      automations: await getAdminApi().addProspectAutomation(productId, { group: String(input?.group ?? "").slice(0, 80), note: String(input?.note ?? "").slice(0, 1000), emails })
    };
  } catch (err) {
    return { ok: false, error: err instanceof AdminApiError && err.apiMessage ? err.apiMessage : "Something went wrong adding it. Try again." };
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
