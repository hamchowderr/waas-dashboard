import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import { POST } from "./route";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function forwarded(sent: Record<string, string>): Promise<Headers> {
  vi.stubEnv("WAAS_API_URL", "https://api.example");
  vi.stubEnv("WAAS_ADMIN_TOKEN", "admin-token");
  const fetch = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  await POST(new NextRequest("https://app.example/api/auth/sign-in/magic-link", { method: "POST", body: "{}", headers: sent }));
  const init = (fetch.mock.calls[0] as unknown as [URL, RequestInit])[1];
  return new Headers(init.headers);
}

it("passes on the browser's address, signed with the admin token", async () => {
  const headers = await forwarded({ "x-real-ip": "203.0.113.7" });
  expect(headers.get("x-anypress-client-ip")).toBe("203.0.113.7");
  expect(headers.get("x-anypress-client-ip-signature")).toBe(createHmac("sha256", "admin-token").update("203.0.113.7").digest("hex"));
});

it("drops an address and signature the browser sent itself", async () => {
  const headers = await forwarded({ "x-anypress-client-ip": "192.0.2.1", "x-anypress-client-ip-signature": "forged" });
  expect(headers.get("x-anypress-client-ip")).toBeNull();
  expect(headers.get("x-anypress-client-ip-signature")).toBeNull();
});
