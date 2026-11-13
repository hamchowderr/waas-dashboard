import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

// Sign-in runs on the provisioning API (Better Auth). Its routes are served here, on the
// dashboard's own address, by passing each request through, so the session cookie belongs to the
// dashboard and browsers never send it to the API. The API's AUTH_URL is this dashboard's address.

/** Hop-by-hop headers, and ones fetch sets itself. */
const DROP_REQUEST = ["host", "connection", "content-length", "transfer-encoding", "keep-alive", "upgrade"];
/** fetch has already decoded the body, so its encoding and length no longer apply. */
const DROP_RESPONSE = ["content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive"];

/**
 * The API counts sign-in attempts per person. Requests from here reach it from Vercel's address, so
 * the browser's address goes along, signed with the admin token so nobody else can set it.
 */
function vouchForClientIp(request: NextRequest, headers: Headers): void {
  headers.delete("x-anypress-client-ip");
  headers.delete("x-anypress-client-ip-signature");
  const secret = process.env.WAAS_ADMIN_TOKEN;
  // Vercel sets x-real-ip to the address that connected to it, replacing anything the browser sent.
  const ip = request.headers.get("x-real-ip")?.trim();
  if (!secret || !ip) return;
  headers.set("x-anypress-client-ip", ip);
  headers.set("x-anypress-client-ip-signature", createHmac("sha256", secret).update(ip).digest("hex"));
}

async function forward(request: NextRequest): Promise<Response> {
  const baseUrl = process.env.WAAS_API_URL;
  if (!baseUrl) return Response.json({ message: "Sign-in is not configured: set WAAS_API_URL" }, { status: 503 });
  const url = new URL(request.nextUrl.pathname + request.nextUrl.search, baseUrl);
  const headers = new Headers(request.headers);
  for (const name of DROP_REQUEST) headers.delete(name);
  headers.set("x-forwarded-host", request.nextUrl.host);
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));
  // fetch below sends its own Sec-Fetch-Mode ("cors"), so the browser's goes along separately: the
  // API's sign-in redirects a browser that navigates to it (an AI app's sign-in) and answers scripts JSON.
  const mode = request.headers.get("sec-fetch-mode");
  if (mode) headers.set("x-forwarded-sec-fetch-mode", mode);
  vouchForClientIp(request, headers);
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000)
    });
  } catch {
    return Response.json({ message: "The provisioning API did not answer. Try again." }, { status: 502 });
  }
  // Copying Headers keeps each Set-Cookie separate.
  const out = new Headers(upstream.headers);
  for (const name of DROP_RESPONSE) out.delete(name);
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
}

export const GET = forward;
export const POST = forward;
