import "server-only";

import { sessionHeaders } from "@/auth";

/**
 * The headers for the API's /account/oauth routes: the person's session, plus, for a platform admin,
 * the admin token, which tells the API to list every storefront and let them approve as an owner.
 */
export async function connectHeaders(viewer: { cookie: string; isAdmin: boolean }): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...(await sessionHeaders(viewer.cookie)), "X-Session-Auth": "1", Accept: "application/json" };
  if (viewer.isAdmin && process.env.WAAS_ADMIN_TOKEN) headers.Authorization = `Bearer ${process.env.WAAS_ADMIN_TOKEN}`;
  return headers;
}
