/**
 * The website check's report, written for a business owner, that a seller sends as a free report. The check itself
 * runs in the API when a prospect's website is read (its src/websitecheck.ts); this is the email that goes with it,
 * and the address rules for reading a prospect's contact details (lib/website-check-fetch.ts).
 */
import type { WebsiteCheckReport } from "./api/types";

export type Report = WebsiteCheckReport;

/** A prospect's address as typed ("joesplumbing.com") made into a URL, or null when it isn't one. */
export function normalizeUrl(input: string): URL | null {
  const raw = input.trim();
  if (!raw || /\s/.test(raw)) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".") || url.username || url.password) return null;
    if (url.port && url.port !== "80" && url.port !== "443") return null;
    return url;
  } catch {
    return null;
  }
}

/** Addresses the check must never fetch: this machine, private networks, link-local and cloud metadata. */
export function isPrivateAddress(ip: string): boolean {
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) {
    const [a, b] = v4.split(".").map(Number) as [number, number];
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  const v6 = ip.toLowerCase();
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

/** A short email a seller sends with the report: the score and the top things to fix, signed in their name. */
export function reportEmail(report: Report, from: { sender: string | null; brand: string }): string {
  const fixes = report.checks
    .filter((c) => c.status !== "pass")
    .sort((a, b) => (a.status === b.status ? b.weight - a.weight : a.status === "fail" ? -1 : 1))
    .slice(0, 3);
  const lines = [
    `Subject: A free check of ${report.host}`,
    "",
    "Hi [prospect],",
    "",
    `I ran a quick check of ${report.host} and it scored ${report.score} out of 100.`,
    ...(fixes.length
      ? ["", `The ${fixes.length === 1 ? "thing" : `${fixes.length} things`} I'd fix first:`, ...fixes.map((c) => `- ${c.title}: ${c.detail}`)]
      : ["", "It's in good shape. If you ever want help keeping it that way, I'm happy to."]),
    "",
    "I've attached the full report. Happy to show you what a fixed version would look like, free.",
    "",
    from.sender ?? "[your name]",
    from.brand
  ];
  return lines.join("\n");
}
