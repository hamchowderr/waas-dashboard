"use client";

import { createAuthClient } from "better-auth/client";
import { emailOTPClient, magicLinkClient, organizationClient } from "better-auth/client/plugins";
import { STOREFRONT_COOKIE } from "./storefront-cookie";

// Browser calls to Better Auth's routes, served on this dashboard's address (app/api/auth), through
// Better Auth's own client with the plugins the API runs (src/auth.ts there).
const authClient = createAuthClient({
  basePath: "/api/auth",
  fetchOptions: { credentials: "same-origin" },
  plugins: [magicLinkClient(), emailOTPClient(), organizationClient()]
});

/** A call's data, or its error as one plain message. */
async function unwrap<T>(call: Promise<{ data: T | null; error: { message?: string } | null }>): Promise<T> {
  const { data, error } = await call;
  if (error) throw new Error(error.message || "Something went wrong. Try again.");
  return data as T;
}

export type Provider = "email" | "github" | "google";

/** Goes to GitHub or Google to sign in, then back to `returnTo` (a path on this site). */
export async function signInWith(provider: Exclude<Provider, "email">, returnTo: string): Promise<void> {
  const { url } = await unwrap(
    authClient.signIn.social({
      provider,
      callbackURL: returnTo,
      errorCallbackURL: `/login?callbackUrl=${encodeURIComponent(returnTo)}`,
      disableRedirect: true
    })
  );
  if (!url) throw new Error("Sign-in did not start. Try again.");
  window.location.href = url;
}

/**
 * Emails a one-time sign-in link to `email`. Opening it signs them in and goes to `returnTo`
 * (a path on this site); a used or expired link comes back to the sign-in page with an error.
 */
export async function emailSignInLink(email: string, returnTo: string): Promise<void> {
  await unwrap(
    authClient.signIn.magicLink({
      email,
      callbackURL: returnTo,
      errorCallbackURL: `/login?callbackUrl=${encodeURIComponent(returnTo)}`
    })
  );
}

/** Signs in with the six-digit code from the sign-in email, for when the email's link is blocked. */
export async function signInWithCode(email: string, code: string): Promise<void> {
  await unwrap(authClient.signIn.emailOtp({ email, otp: code }));
}

export interface PendingInvitation {
  id: string;
  organizationName: string;
  role: string;
  status: string;
  expiresAt: string;
}

/** Invitations sent to the signed-in address that can still be accepted. */
export async function pendingInvitations(): Promise<PendingInvitation[]> {
  const { data } = await authClient.organization.listUserInvitations();
  const rows = (data ?? []).map((i) => ({ ...i, expiresAt: new Date(i.expiresAt).toISOString() })) as unknown as PendingInvitation[];
  return rows.filter((i) => i.status === "pending" && new Date(i.expiresAt).getTime() > Date.now());
}

export async function signOut(): Promise<void> {
  await unwrap(authClient.signOut());
}

/**
 * Joins the storefront's organization and makes it the one this session acts for. The invitation
 * must be for the signed-in email address.
 */
export async function acceptInvitation(invitationId: string): Promise<void> {
  await unwrap(authClient.organization.acceptInvitation({ invitationId }));
}

/** Picks the organization the session acts for, for someone in more than one. */
async function setActiveOrganization(organizationId: string): Promise<void> {
  await unwrap(authClient.organization.setActive({ organizationId }));
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
  await authClient.getSession();
}
