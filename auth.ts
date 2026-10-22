import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import type { Branding } from "@/lib/api/types";
import { sellerAddress } from "@/lib/dashboard-host";
import { STOREFRONT_COOKIE } from "@/lib/storefront-cookie";

/**
 * Sign-in runs on the provisioning API (Better Auth, the API's docs/accounts.md). The dashboard
 * passes /api/auth/* through to it (app/api/auth/[...all]/route.ts), so the session cookie is the
 * dashboard's own. On the server, the cookie goes on to the API to find out who is signed in.
 *
 * Two kinds of people sign in:
 * - platform admins: GitHub logins listed in ALLOWED_GITHUB_LOGINS, or email addresses listed in
 *   ALLOWED_ADMIN_EMAILS. They see every storefront, through the API's /admin routes and the admin token.
 * - customers: members of a storefront's organization, or of a reseller's (all its storefronts). They
 *   see the storefront they act for only, through the API's /account routes with their session; the
 *   API does the narrowing. The storefront picked in the switcher goes along as X-Product-Id.
 */

/** GitHub logins of the platform admins, from ALLOWED_GITHUB_LOGINS (comma or space separated). */
export function allowedLogins(): Set<string> {
  return new Set(
    (process.env.ALLOWED_GITHUB_LOGINS ?? "")
      .split(/[\s,]+/)
      .map((login) => login.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAllowed(login: unknown): boolean {
  return typeof login === "string" && allowedLogins().has(login.toLowerCase());
}

/** Email addresses of the platform admins, from ALLOWED_ADMIN_EMAILS (comma or space separated). */
export function allowedAdminEmails(): Set<string> {
  return new Set(
    (process.env.ALLOWED_ADMIN_EMAILS ?? "")
      .split(/[\s,]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

/** A platform admin: by GitHub login, or by an email address the API has verified. */
export function isPlatformAdmin(user: { githubLogin: string | null; email: string; emailVerified?: boolean }): boolean {
  if (isAllowed(user.githubLogin)) return true;
  return user.emailVerified === true && allowedAdminEmails().has(user.email.toLowerCase());
}

export type OrgRole = "owner" | "admin" | "member";

export interface Membership {
  organizationId: string;
  organizationName: string;
  productId: string;
  productName: string;
  role: OrgRole;
  /** Set when the membership comes from a reseller's team, which reaches all the reseller's storefronts. */
  resellerId: string | null;
}

export interface Viewer {
  user: { id: string; name: string; email: string; emailVerified?: boolean; image: string | null; githubLogin: string | null };
  /** True for a platform admin, who sees every storefront. */
  isAdmin: boolean;
  memberships: Membership[];
  /** The storefront a customer acts for; null for an admin, or a customer who must pick one. */
  active: Membership | null;
  /** The active storefront's own look (the API's docs/branding.md); null shows the platform's. */
  brand: Branding | null;
  /** The Better Auth cookies, to pass on to the API for a customer. */
  cookie: string;
}

const fixtureViewer: Viewer = {
  user: { id: "fixture", name: "Sample Admin", email: "admin@example.com", image: null, githubLogin: "sample-admin" },
  isAdmin: true,
  memberships: [],
  active: null,
  brand: null,
  cookie: ""
};

/** Better Auth's cookies from this request, as a Cookie header; empty when there are none. */
export async function authCookieHeader(): Promise<string> {
  const store = await cookies();
  return store
    .getAll()
    .filter((c) => c.name.startsWith("better-auth.") || c.name.startsWith("__Secure-better-auth."))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

/**
 * The session headers for the API: the cookies, the storefront picked in the switcher, and on a
 * seller's own address that address, so the API narrows the session to its storefront.
 */
export async function sessionHeaders(cookie: string): Promise<Record<string, string>> {
  const picked = (await cookies()).get(STOREFRONT_COOKIE)?.value;
  const seller = await sellerAddress();
  return {
    Cookie: cookie,
    ...(picked && /^[0-9a-f-]{36}$/i.test(picked) ? { "X-Product-Id": picked } : {}),
    ...(seller ? { "X-Dashboard-Host": seller.host } : {})
  };
}

/**
 * Who is signed in, or null. Asks the API once per request (GET /account). An API that is down
 * throws, so a page shows its error instead of sending the person back to sign in.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (process.env.WAAS_API_FIXTURES === "1") return fixtureViewer;
  const baseUrl = process.env.WAAS_API_URL;
  if (!baseUrl) throw new Error("Set WAAS_API_URL, or WAAS_API_FIXTURES=1 for sample data.");
  const cookie = await authCookieHeader();
  if (!cookie) return null;
  const response = await fetch(new URL("/account", baseUrl), {
    headers: { ...(await sessionHeaders(cookie)), Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000)
  });
  if (response.status === 403) return null;
  if (!response.ok) throw new Error(`Provisioning API returned ${response.status} for /account`);
  const body = (await response.json()) as Pick<Viewer, "user" | "memberships" | "active"> & { brand?: Branding | null };
  // On a seller's own address everyone is that seller's team, platform admins included.
  const isAdmin = isPlatformAdmin(body.user) && !(await sellerAddress());
  // The platform admin always sees the platform's own look.
  return { ...body, isAdmin, active: isAdmin ? null : body.active, brand: isAdmin ? null : (body.brand ?? null), cookie };
});

/** Whether the viewer may use the dashboard's pages: an admin, or a customer with a storefront. */
export function canUseDashboard(viewer: Viewer | null): viewer is Viewer {
  return !!viewer && (viewer.isAdmin || !!viewer.active);
}

/** Owners and admins of a storefront may make changes; members may only look. */
export function canChange(viewer: Viewer): boolean {
  if (viewer.isAdmin) return true;
  return (viewer.active?.role ?? "").split(",").some((r) => r.trim() === "owner" || r.trim() === "admin");
}
