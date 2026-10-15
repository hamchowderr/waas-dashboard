import type { NextRequest } from "next/server";

// Sign-in runs on the provisioning API (Better Auth). Its routes are served here, on the
// dashboard's own address, by passing each request through, so the session cookie belongs to the
// dashboard and browsers never send it to the API. The API's AUTH_URL is this dashboard's address.

/** Hop-by-hop headers, and ones fetch sets itself. */
const DROP_REQUEST = ["host", "connection", "content-length", "transfer-encoding", "keep-alive", "upgrade"];
/** fetch has already decoded the body, so its encoding and length no longer apply. */
const DROP_RESPONSE = ["content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive"];

async function forward(request: NextRequest): Promise<Response> {
  const baseUrl = process.env.WAAS_API_URL;
  if (!baseUrl) return Response.json({ message: "Sign-in is not configured: set WAAS_API_URL" }, { status: 503 });
  const url = new URL(request.nextUrl.pathname + request.nextUrl.search, baseUrl);
  const headers = new Headers(request.headers);
  for (const name of DROP_REQUEST) headers.delete(name);
  headers.set("x-forwarded-host", request.nextUrl.host);
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));
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
