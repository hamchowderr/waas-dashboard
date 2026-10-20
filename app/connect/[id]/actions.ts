"use server";

import { getViewer } from "@/auth";
import { connectHeaders } from "./headers";

// Approving (or declining) an AI app's connection to the API's MCP server, as the signed-in person.
// The API checks everything again: the request, that the storefront is theirs, their role and the scopes.
// For a platform admin the admin token goes along too, which lets them approve for any storefront.

export type ConnectAnswer = { action: "approve"; productId: string; scopes: string[] } | { action: "deny" };
export type ConnectResult = { ok: true; redirectUrl: string } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCOPE = /^[a-z]+:(read|write)$/;

export async function answerConnection(id: string, answer: ConnectAnswer): Promise<ConnectResult> {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return { ok: false, error: "You are signed out. Sign in again." };
  if (!UUID.test(id)) return { ok: false, error: "This connection request isn't valid." };
  let body: object;
  if (answer.action === "approve") {
    const scopes = Array.isArray(answer.scopes) ? answer.scopes.map(String).filter((s) => SCOPE.test(s)) : [];
    if (!scopes.length) return { ok: false, error: "Tick at least one thing the app may see." };
    body = { action: "approve", productId: String(answer.productId), scopes };
  } else {
    body = { action: "deny" };
  }
  try {
    const response = await fetch(new URL(`/account/oauth/requests/${id}`, process.env.WAAS_API_URL), {
      method: "POST",
      headers: { ...connectHeaders(viewer), "Content-Type": "application/json" },
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
