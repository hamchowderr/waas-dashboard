import "server-only";

import { lookup } from "node:dns/promises";

import { analyze, isPrivateAddress, normalizeUrl, type Fetched, type Report } from "./website-check";

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 3_000_000;
const MAX_REDIRECTS = 5;

/** Refuses hosts that resolve to this machine or a private network, so the check can't be pointed inward. */
async function assertPublic(url: URL) {
  const addresses = await lookup(url.hostname, { all: true }).catch(() => []);
  if (!addresses.length) throw new CheckError("We couldn't find that website. Check the address.");
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new CheckError("That address can't be checked.");
}

export class CheckError extends Error {}

/** One GET that follows redirects by hand, checking every hop, and reads at most MAX_BYTES. */
async function get(start: URL, signal: AbortSignal): Promise<{ url: URL; status: number; html: string; bytes: number }> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; WebsiteCheck/1.0)", accept: "text/html,application/xhtml+xml" }
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel();
      const next = new URL(location, url);
      if (next.protocol !== "http:" && next.protocol !== "https:") throw new CheckError("That website redirects somewhere we can't check.");
      url = next;
      continue;
    }
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    return { url, status: res.status, html: new TextDecoder().decode(Buffer.concat(chunks)), bytes };
  }
  throw new CheckError("That website redirects too many times.");
}

/** Checks a prospect's website and returns the report, or throws a CheckError with a plain reason. */
export async function checkWebsite(input: string): Promise<Report> {
  const url = normalizeUrl(input);
  if (!url) throw new CheckError("Enter a website address, such as joesplumbing.com.");
  // Sample mode answers .example addresses (which never resolve) with a typical dated small-business page.
  if (process.env.WAAS_API_FIXTURES === "1" && url.hostname.endsWith(".example")) return analyze(sampleFetch(url));
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const started = performance.now();
  let page;
  try {
    page = await get(url, signal);
  } catch (err) {
    if (err instanceof CheckError) throw err;
    throw new CheckError("We couldn't reach that website. It may be down, or blocking checks.");
  }
  const ms = performance.now() - started;
  if (page.status >= 400) throw new CheckError(`That website answered with an error (${page.status}).`);

  // Does the plain address send visitors to the secure one? Only worth asking when the site ended up on https.
  let redirectsToHttps: boolean | null = null;
  if (page.url.protocol === "https:") {
    const plain = new URL(page.url);
    plain.protocol = "http:";
    plain.pathname = "/";
    plain.search = "";
    try {
      const res = await get(plain, AbortSignal.timeout(5_000));
      redirectsToHttps = res.url.protocol === "https:";
    } catch {
      redirectsToHttps = null;
    }
  }

  const fetched: Fetched = { requested: url.href, finalUrl: page.url.href, redirectsToHttps, status: page.status, ms, bytes: page.bytes, html: page.html };
  return analyze(fetched);
}

function sampleFetch(url: URL): Fetched {
  const html = `<html><head><title>Home</title><meta name="generator" content="WordPress 5.2"></head><body>
<h1>Welcome to ${url.hostname}</h1><a href="tel:5550100">Call us</a><img src=a.jpg><img src=b.jpg><img src=c.jpg alt="Our team">
<footer>&copy; 2019</footer></body></html>`;
  return { requested: url.href, finalUrl: `http://${url.hostname}/`, redirectsToHttps: null, status: 200, ms: 3100, bytes: 2_400_000, html };
}
