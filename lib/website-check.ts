/**
 * The website check: a quick look at a prospect's current website, written for a business owner, that a seller sends
 * as a free report. `analyze` is pure (HTML in, checks out) so it is tested without the network; fetching the page
 * safely is in lib/website-check-fetch.ts.
 */

export type CheckStatus = "pass" | "warn" | "fail";

export type Check = {
  id: string;
  title: string;
  status: CheckStatus;
  /** One plain sentence on what was found and why it matters, for the prospect. */
  detail: string;
  weight: number;
};

export type Fetched = {
  /** The address asked for, and where it ended up after redirects. */
  requested: string;
  finalUrl: string;
  /** Whether a plain http:// address sends visitors on to https://. Null when not tested. */
  redirectsToHttps: boolean | null;
  status: number;
  ms: number;
  bytes: number;
  html: string;
};

export type Report = {
  url: string;
  host: string;
  checkedAt: string;
  /** 0 to 100. */
  score: number;
  builder: string | null;
  checks: Check[];
};

const attr = (tag: string, name: string) => new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag)?.slice(2).find((v) => v !== undefined) ?? null;

function metaContent(html: string, key: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = (attr(tag, "name") ?? attr(tag, "property") ?? "").toLowerCase();
    if (name === key) return attr(tag, "content")?.trim() ?? "";
  }
  return null;
}

const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&copy;|&#169;/gi, "©")
    .replace(/\s+/g, " ");

/** The site builder the page says it was made with, when it says. */
export function builderOf(html: string): string | null {
  const generator = metaContent(html, "generator");
  if (generator) {
    const known = /(WordPress|Wix|Squarespace|Weebly|Joomla|Drupal|Shopify|GoDaddy|Webflow|Duda|HubSpot|Ghost)/i.exec(generator);
    return known ? known[1]!.replace(/^./, (c) => c.toUpperCase()) : generator.split(/[\s;]/)[0]!;
  }
  if (/wp-content\//i.test(html)) return "WordPress";
  if (/static\.wixstatic\.com|wix\.com/i.test(html)) return "Wix";
  if (/squarespace\.com|static1\.squarespace/i.test(html)) return "Squarespace";
  if (/cdn\.shopify\.com/i.test(html)) return "Shopify";
  if (/img1\.wsimg\.com|godaddy/i.test(html)) return "GoDaddy";
  if (/webflow\.com/i.test(html)) return "Webflow";
  return null;
}

/** The newest year after a © on the page, or null. */
export function copyrightYear(html: string): number | null {
  const years = [...text(html).matchAll(/(?:©|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map((m) => Number(m[1]));
  return years.length ? Math.max(...years) : null;
}

const ACT_ONLINE = /\b(book (now|online|an appointment)|schedule|appointment|reserve|add to cart|shop now|checkout|buy now|donate|give online|giving|register|enrol|enroll|join now|sign up)\b/i;

export function analyze(page: Fetched, now = new Date()): Report {
  const html = page.html;
  const url = new URL(page.finalUrl);
  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);

  const https = url.protocol === "https:";
  add({
    id: "secure",
    title: "Secure connection",
    weight: 3,
    status: !https ? "fail" : page.redirectsToHttps === false ? "warn" : "pass",
    detail: !https
      ? "The site doesn't use a secure connection, so browsers mark it \"Not secure\" and visitors may leave."
      : page.redirectsToHttps === false
        ? "The secure address works, but the plain address doesn't send visitors to it."
        : "The site uses a secure connection (https)."
  });

  const seconds = page.ms / 1000;
  const mb = page.bytes / 1_000_000;
  add({
    id: "speed",
    title: "Loads quickly",
    weight: 3,
    status: seconds < 1.5 && mb < 2 ? "pass" : seconds < 4 ? "warn" : "fail",
    detail: `The page took ${seconds.toFixed(1)} seconds to arrive${mb >= 0.05 ? ` and is ${mb.toFixed(1)} MB` : ""}. ${
      seconds < 1.5 ? "That's quick." : "Slow pages lose visitors, most of all on phones."
    }`
  });

  const viewport = metaContent(html, "viewport");
  add({
    id: "mobile",
    title: "Works on phones",
    weight: 3,
    status: viewport && /width\s*=\s*device-width/i.test(viewport) ? "pass" : "fail",
    detail:
      viewport && /width\s*=\s*device-width/i.test(viewport)
        ? "The site is set up to fit phone screens."
        : "The site isn't set up for phones, so visitors on a phone have to pinch and zoom."
  });

  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
  const description = metaContent(html, "description") ?? "";
  add({
    id: "search",
    title: "Ready for Google",
    weight: 2,
    status: title.length >= 10 && description.length >= 50 ? "pass" : title.length >= 10 || description ? "warn" : "fail",
    detail: !title
      ? "The page has no title, which is what Google shows as the headline in search results."
      : !description
        ? `The title is "${title.slice(0, 70)}", but there's no description for Google to show under it.`
        : title.length < 10 || description.length < 50
          ? "The title or the description Google shows is very short."
          : "The page has a clear title and description for Google to show."
  });

  const h1 = /<h1\b/i.test(html);
  add({
    id: "heading",
    title: "Clear main heading",
    weight: 1,
    status: h1 ? "pass" : "warn",
    detail: h1 ? "The page has a main heading that says what it's about." : "The page has no main heading, which helps visitors and Google see what the business does."
  });

  const ogImage = metaContent(html, "og:image");
  add({
    id: "sharing",
    title: "Looks good when shared",
    weight: 1,
    status: ogImage ? "pass" : "warn",
    detail: ogImage ? "Links to the site show a picture when shared on Facebook or in a text." : "Links shared on Facebook or in a text show no picture."
  });

  const year = copyrightYear(html);
  const age = year ? now.getFullYear() - year : null;
  add({
    id: "fresh",
    title: "Kept up to date",
    weight: 2,
    status: age === null ? "warn" : age <= 1 ? "pass" : age <= 3 ? "warn" : "fail",
    detail:
      age === null
        ? "We couldn't tell when the site was last updated."
        : age <= 1
          ? "The site looks recently updated."
          : `The footer still says ${year}, so the site looks like it hasn't been updated in ${age} years.`
  });

  const contact = /href\s*=\s*["']?(tel:|mailto:)/i.test(html) || /<form\b/i.test(html);
  add({
    id: "contact",
    title: "Easy to contact",
    weight: 2,
    status: contact ? "pass" : "fail",
    detail: contact ? "Visitors can tap to call, email or send a message." : "There's no tap-to-call number, email link or contact form on the page."
  });

  const act = ACT_ONLINE.test(text(html));
  add({
    id: "online",
    title: "Customers can act online",
    weight: 2,
    status: act ? "pass" : "warn",
    detail: act ? "Visitors can book, buy, give or sign up online." : "Visitors can't book, buy, give or sign up from the page, so they have to call or leave."
  });

  const images = html.match(/<img\b[^>]*>/gi) ?? [];
  const described = images.filter((tag) => (attr(tag, "alt") ?? "").trim().length > 0).length;
  if (images.length >= 3) {
    const share = described / images.length;
    add({
      id: "images",
      title: "Pictures are described",
      weight: 1,
      status: share >= 0.8 ? "pass" : share >= 0.4 ? "warn" : "fail",
      detail:
        share >= 0.8
          ? "Pictures have descriptions for screen readers and Google."
          : `${images.length - described} of ${images.length} pictures have no description, which hurts accessibility and search.`
    });
  }

  const total = checks.reduce((n, c) => n + c.weight, 0);
  const got = checks.reduce((n, c) => n + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
  return {
    url: page.finalUrl,
    host: url.hostname.replace(/^www\./, ""),
    checkedAt: now.toISOString(),
    score: Math.round((got / total) * 100),
    builder: builderOf(html),
    checks
  };
}

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
