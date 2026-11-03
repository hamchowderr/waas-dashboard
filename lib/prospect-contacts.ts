import type { ProspectContacts, SocialNetwork } from "@/lib/api/types";

/** Addresses that turn up in page code but never reach a person. */
const JUNK_EMAIL = /(\.(png|jpe?g|gif|svg|webp|css|js)$)|@(example\.(com|org|net)|domain\.com|email\.com|yourdomain\.|sentry|wixpress\.com|sentry-next\.wixpress\.com|.*\.sentry\.io)|^(name|your|yourname|you|user|email|someone)@/i;

const SOCIAL: { network: SocialNetwork; host: RegExp; skip?: RegExp }[] = [
  { network: "facebook", host: /(^|\.)facebook\.com$/, skip: /^\/(sharer|share|dialog|plugins|tr|login|groups\/?$)/ },
  { network: "instagram", host: /(^|\.)instagram\.com$/, skip: /^\/(p|reel|explore|accounts)\// },
  { network: "linkedin", host: /(^|\.)linkedin\.com$/, skip: /^\/(share|shareArticle|sharing)/ },
  { network: "x", host: /(^|\.)(twitter|x)\.com$/, skip: /^\/(intent|share|home)/ },
  { network: "youtube", host: /(^|\.)youtube\.com$/, skip: /^\/(watch|embed|results)/ },
  { network: "tiktok", host: /(^|\.)tiktok\.com$/, skip: /^\/(embed|share)/ }
];

const decodeEntities = (s: string) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/&amp;/g, "&").replace(/&commat;|&#64;/g, "@");

/** Cloudflare hides addresses as hex XOR-ed with the first byte. */
function cloudflareEmail(hex: string): string | null {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length < 4) return null;
  const key = parseInt(hex.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  return out;
}

const hrefs = (html: string) => [...html.matchAll(/<a\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: decodeEntities(m[1]!.trim()), text: m[2]!.replace(/<[^>]+>/g, " ").trim() }));

/** Emails, a contact page and social profiles found in one page of a prospect's website. */
export function contactsFrom(html: string, pageUrl: string): ProspectContacts {
  const base = new URL(pageUrl);
  const site = base.hostname.replace(/^www\./, "");
  const emails = new Set<string>();
  const add = (raw: string | null) => {
    const email = raw?.trim().toLowerCase().replace(/^mailto:/, "").split("?")[0];
    if (email && /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email) && !JUNK_EMAIL.test(email)) emails.add(email);
  };
  const links = hrefs(html);
  for (const { href } of links) if (/^mailto:/i.test(href)) add(decodeURIComponent(href));
  for (const m of html.matchAll(/data-cfemail=["']([0-9a-f]+)["']/gi)) add(cloudflareEmail(m[1]!));
  const text = decodeEntities(html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " "));
  for (const m of text.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) add(m[0]);

  const socials: ProspectContacts["socials"] = [];
  let contactPage: string | null = null;
  for (const { href, text: label } of links) {
    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    const host = url.hostname.toLowerCase();
    const social = SOCIAL.find((s) => s.host.test(host));
    if (social) {
      if (url.pathname.length > 1 && !social.skip?.test(url.pathname) && !socials.some((s) => s.network === social.network)) {
        url.search = "";
        url.hash = "";
        socials.push({ network: social.network, url: url.href });
      }
      continue;
    }
    if (!contactPage && host.replace(/^www\./, "") === site && (/contact/i.test(url.pathname) || /^contact( us)?$/i.test(label))) {
      url.hash = "";
      if (url.href !== base.href) contactPage = url.href;
    }
  }

  // The site's own addresses first: they reach the business, not its web designer.
  const sorted = [...emails].sort((a, b) => Number(!a.endsWith(`@${site}`)) - Number(!b.endsWith(`@${site}`)));
  return { emails: sorted.slice(0, 3), contactPage, socials };
}

/** Joins what two pages of the same site found. */
export function mergeContacts(a: ProspectContacts, b: ProspectContacts): ProspectContacts {
  const socials = [...a.socials];
  for (const s of b.socials) if (!socials.some((x) => x.network === s.network)) socials.push(s);
  return { emails: [...new Set([...a.emails, ...b.emails])].slice(0, 3), contactPage: a.contactPage ?? b.contactPage, socials };
}
