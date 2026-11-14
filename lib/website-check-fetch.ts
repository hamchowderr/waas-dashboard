import "server-only";

import { lookup } from "node:dns/promises";

import type { ProspectContacts } from "./api/types";
import { contactsFrom, mergeContacts } from "./prospect-contacts";
import { isPrivateAddress, normalizeUrl } from "./website-check";

const MAX_BYTES = 3_000_000;
const MAX_REDIRECTS = 5;

/** Refuses hosts that resolve to this machine or a private network, so the check can't be pointed inward. */
async function assertPublic(url: URL) {
  const addresses = await lookup(url.hostname, { all: true }).catch(() => []);
  if (!addresses.length) throw new CheckError("We couldn't find that website. Check the address.");
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new CheckError("That address can't be checked.");
}

class CheckError extends Error {}

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

const NO_CONTACTS: ProspectContacts = { emails: [], contactPage: null, socials: [] };

/**
 * Emails, a contact page and social profiles from a prospect's own website: its home page, then its contact page
 * when the home page has no email. Never throws; a site that can't be read answers nothing found.
 */
export async function findContacts(input: string): Promise<ProspectContacts> {
  const url = normalizeUrl(input);
  if (!url) return NO_CONTACTS;
  if (process.env.WAAS_API_FIXTURES === "1" && url.hostname.endsWith(".example")) return sampleContacts(url);
  try {
    const home = await get(url, AbortSignal.timeout(8_000));
    if (home.status >= 400) return NO_CONTACTS;
    let found = contactsFrom(home.html, home.url.href);
    if (!found.emails.length && found.contactPage) {
      const contact = await get(new URL(found.contactPage), AbortSignal.timeout(6_000)).catch(() => null);
      if (contact && contact.status < 400) found = mergeContacts(found, contactsFrom(contact.html, contact.url.href));
    }
    return found;
  } catch {
    return NO_CONTACTS;
  }
}

function sampleContacts(url: URL): ProspectContacts {
  const host = url.hostname;
  const n = host.length % 3;
  return {
    emails: n === 2 ? [] : [`${n ? "office" : "hello"}@${host}`],
    contactPage: `https://${host}/contact/`,
    socials: [
      { network: "facebook", url: `https://www.facebook.com/${host.split(".")[0]}` },
      ...(n ? [{ network: "instagram" as const, url: `https://www.instagram.com/${host.split(".")[0]}` }] : [])
    ]
  };
}
