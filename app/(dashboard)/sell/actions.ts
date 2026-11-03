"use server";

import { getViewer } from "@/auth";
import type { Report } from "@/lib/website-check";
import { CheckError, checkWebsite } from "@/lib/website-check-fetch";

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
