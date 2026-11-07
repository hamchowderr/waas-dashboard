"use server";

import { getViewer } from "@/auth";
import { connectHeaders } from "./headers";

// Answering an AI app's sign-in, as the signed-in person (or, for one website, by its address).
// `oauthQuery` is the sign-in request the API signed; the API checks everything again: the
// signature, that the storefront is theirs, their role and the scopes. For a platform admin the
// admin token goes along too, which lets them approve for any storefront.

export type ConnectAnswer =
  | { action: "approve"; productId: string; scopes: string[] }
  | { action: "approve"; newStorefront: string; scopes: string[] }
  | { action: "deny" };
export type ConnectResult = { ok: true; redirectUrl: string } | { ok: false; error: string };

const SCOPE = /^[a-z]+:(read|write)$/;

const validQuery = (oauthQuery: unknown): oauthQuery is string => typeof oauthQuery === "string" && oauthQuery.length > 0 && oauthQuery.length <= 8192;

async function post(path: string, headers: Record<string, string>, body: object): Promise<ConnectResult> {
  try {
    const response = await fetch(new URL(path, process.env.WAAS_API_URL), {
      method: "POST",
      headers: { ...headers, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000)
    });
    const json = (await response.json().catch(() => ({}))) as { redirectUrl?: string; message?: string };
    if (!response.ok || !json.redirectUrl) return { ok: false, error: json.message ?? "The API did not answer. Try again." };
    return { ok: true, redirectUrl: json.redirectUrl };
  } catch {
    return { ok: false, error: "The API did not answer. Try again." };
  }
}

export async function answerConnection(oauthQuery: string, answer: ConnectAnswer): Promise<ConnectResult> {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return { ok: false, error: "You are signed out. Sign in again." };
  if (!validQuery(oauthQuery)) return { ok: false, error: "This connection request isn't valid." };
  let body: object;
  if (answer.action === "approve") {
    const scopes = Array.isArray(answer.scopes) ? answer.scopes.map(String).filter((s) => SCOPE.test(s)) : [];
    if (!scopes.length) return { ok: false, error: "Tick at least one thing the app may see." };
    if ("newStorefront" in answer) {
      const name = String(answer.newStorefront).trim();
      if (!name) return { ok: false, error: "Name your storefront." };
      body = { oauth_query: oauthQuery, action: "approve", newStorefront: name.slice(0, 100), scopes };
    } else {
      body = { oauth_query: oauthQuery, action: "approve", productId: String(answer.productId), scopes };
    }
  } else {
    body = { oauth_query: oauthQuery, action: "deny" };
  }
  // Sample mode has no API: approving goes back to the dashboard.
  if (process.env.WAAS_API_FIXTURES === "1") return { ok: true, redirectUrl: "/" };
  return post("/account/oauth/connect", await connectHeaders(viewer), body);
}

/** "Sign in with your website": the API finds the website and answers its WordPress dashboard's address, or declines. No sign-in needed. */
export async function connectWebsite(oauthQuery: string, answer: { site: string } | { action: "deny" }): Promise<ConnectResult> {
  if (!validQuery(oauthQuery)) return { ok: false, error: "This connection request isn't valid." };
  if ("site" in answer && !String(answer.site).trim()) return { ok: false, error: "Type your website's address." };
  if (process.env.WAAS_API_FIXTURES === "1") return { ok: true, redirectUrl: "/" };
  const body = "site" in answer ? { oauth_query: oauthQuery, site: String(answer.site).trim().slice(0, 253) } : { oauth_query: oauthQuery, action: "deny" };
  return post("/oauth/site/start", {}, body);
}
