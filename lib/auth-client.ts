"use client";

import { STOREFRONT_COOKIE } from "./storefront-cookie";

// Browser calls to Better Auth's routes, served on this dashboard's address (app/api/auth).

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    credentials: "same-origin"
  });
  const data = (await response.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!response.ok) throw new Error(data?.message || "Something went wrong. Try again.");
  return data as T;
}

export type Provider = "email" | "github" | "google";

/** Goes to GitHub or Google to sign in, then back to `returnTo` (a path on this site). */
export async function signInWith(provider: Exclude<Provider, "email">, returnTo: string): Promise<void> {
  const { url } = await post<{ url?: string }>("/sign-in/social", {
    provider,
    callbackURL: returnTo,
    errorCallbackURL: `/login?callbackUrl=${encodeURIComponent(returnTo)}`
  });
  if (!url) throw new Error("Sign-in did not start. Try again.");
  window.location.href = url;
}

/**
 * Emails a one-time sign-in link to `email`. Opening it signs them in and goes to `returnTo`
 * (a path on this site); a used or expired link comes back to the sign-in page with an error.
 */
export async function emailSignInLink(email: string, returnTo: string): Promise<void> {
  await post("/sign-in/magic-link", {
    email,
    callbackURL: returnTo,
    errorCallbackURL: `/login?callbackUrl=${encodeURIComponent(returnTo)}`
  });
}

export async function signOut(): Promise<void> {
  await post("/sign-out", {});
}

/**
 * Joins the storefront's organization and makes it the one this session acts for. The invitation
 * must be for the signed-in email address.
 */
export async function acceptInvitation(invitationId: string): Promise<void> {
  await post("/organization/accept-invitation", { invitationId });
}

/** Picks the organization the session acts for, for someone in more than one. */
export async function setActiveOrganization(organizationId: string): Promise<void> {
  await post("/organization/set-active", { organizationId });
}

/**
 * Picks the storefront to act for, for someone with more than one. A reseller's team has one
 * organization for all its storefronts, so the storefront itself goes in a cookie too.
 */
export async function pickStorefront(storefront: { organizationId: string; productId: string }): Promise<void> {
  await setActiveOrganization(storefront.organizationId);
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${STOREFRONT_COOKIE}=${encodeURIComponent(storefront.productId)}; path=/; max-age=31536000; samesite=lax${secure}`;
}

/** Keeps the session going: the API extends it, and sends the cookie back with its new expiry. */
export async function refreshSession(): Promise<void> {
  await fetch("/api/auth/get-session", { credentials: "same-origin", cache: "no-store" });
}
