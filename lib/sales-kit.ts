/**
 * The sales kit in content/sales-kit: one playbook per customer group and the shared guides, as Markdown with
 * {{placeholders}}. Parsing and filling are pure, so the Sell page can fill them in the browser as prices change;
 * reading the files is in lib/sales-kit-files.ts (server only).
 */

import type { ProspectAutomationInput } from "@/lib/api/types";
import { DEMOS as SITE_DEMOS, playgroundUrl } from "./demos";
import PRICES from "./pricing.json";

export const PLANS = ["website", "bookings", "store", "community", "everything"] as const;
export type Plan = (typeof PLANS)[number];

export const PLAN_NAMES: Record<Plan, string> = {
  website: "Website",
  bookings: "Bookings",
  store: "Store",
  community: "Community & courses",
  everything: "Everything"
};

/** Suggested monthly prices from guides/pricing.md, in whole dollars, used until the seller sets their own. */
export const SUGGESTED_PRICES: Record<Plan, number> = { website: 49, bookings: 79, store: 99, community: 129, everything: 249 };

/** A plan's Small monthly list price from AnyPress's one price list (the API's GET /pricing, copied into
 * lib/pricing.json by `npm run prices`). The kit's `store` is the API's `online-store`. */
function listPrice(plan: Plan): number {
  const key = plan === "store" ? "online-store" : plan;
  const type = PRICES.siteTypes.find((t) => t.key === key);
  if (!type) throw new Error(`No price for ${plan} in lib/pricing.json`);
  return type.monthly.small;
}

/** The seller's cost per site, Small, monthly, at list price, in whole dollars. */
const LIST_COST = Object.fromEntries(PLANS.map((plan) => [plan, listPrice(plan)])) as Record<Plan, number>;

/** The volume savings in words: "10%, 20% and 30% at 3, 10 and 25 live sites". */
const and = (items: (string | number)[]) => `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
export const VOLUME_IN_WORDS = `${and(PRICES.volumeTiers.map((t) => `${t.percent}%`))} at ${and(PRICES.volumeTiers.map((t) => t.sites))} live sites`;

/** What a seller's site costs after the volume saving for a number of live sites, in dollars. */
function volumeCost(plan: Plan, sites: number): number {
  const tier = [...PRICES.volumeTiers].reverse().find((t) => sites >= t.sites);
  return Math.round(LIST_COST[plan] * (100 - (tier?.percent ?? 0))) / 100;
}

/** One-time setup fees the pricing guide suggests. */
const SETUP_FEES: Record<Plan, string> = {
  website: "$199 to $499 one-time",
  bookings: "$299 to $699",
  store: "$499 to $999",
  community: "$499 to $999",
  everything: "$999 to $2,499"
};

/**
 * The guides' price placeholders, filled from the price list when a guide is read, so no guide types a price:
 * {{prices.costs}} and {{prices.suggested}} are tables, the rest are words.
 */
function priceText(name: string): string | null {
  const tiers = PRICES.volumeTiers;
  const range = (i: number) => (tiers[i + 1] ? `${tiers[i].sites}-${tiers[i + 1].sites - 1} sites` : `${tiers[i].sites}+ sites`);
  const exampleCost = (sites: number) => volumeCost("website", sites);
  switch (name) {
    case "prices.costs":
      return [
        `| Plan | Your cost | ${tiers.map((_, i) => range(i)).join(" | ")} |`,
        `|---|---|${tiers.map(() => "---").join("|")}|`,
        ...PLANS.map((plan) => `| ${PLAN_NAMES[plan]} | $${dollars(LIST_COST[plan])} | ${tiers.map((t) => `$${volumeCost(plan, t.sites).toFixed(2)}`).join(" | ")} |`)
      ].join("\n");
    case "prices.suggested":
      return [
        "| Plan | Suggested price | Your profit at list cost | With a setup fee |",
        "|---|---|---|---|",
        ...PLANS.map((plan) => `| ${PLAN_NAMES[plan]} | $${SUGGESTED_PRICES[plan]} a month | $${dollars(SUGGESTED_PRICES[plan] - LIST_COST[plan])} a month | ${SETUP_FEES[plan]} |`)
      ].join("\n");
    case "prices.tiers":
      return and(tiers.map((t) => `${t.percent}%`));
    case "prices.sizes":
      return `Medium sites cost ${PRICES.sizeTimes.medium}x and Large ${PRICES.sizeTimes.large}x`;
    case "prices.yearly":
      return `${PRICES.yearlyMonths}x`;
    case "prices.free":
      return `${12 - PRICES.yearlyMonths} months free`;
    case "prices.wholesale":
      return `${PRICES.wholesalePercent}%`;
    case "prices.example": {
      const price = SUGGESTED_PRICES.website;
      const low = tiers[0];
      const ten = exampleCost(10);
      return `Ten customers on Website at $${price} a month bring in $${price * 10} a month. At ${range(0)} your cost is $${exampleCost(low.sites).toFixed(2)} each; at 10 sites it drops to $${ten.toFixed(2)}, so ten sites cost you $${dollars(Math.round(ten * 1000) / 100)} and leave $${dollars(Math.round((price - ten) * 1000) / 100)} a month before your own time.`;
    }
    default:
      return null;
  }
}

/** The groups in the order the Sell page shows them; ids match the CRM's customer group field. */
export const GROUP_IDS = ["shops", "regulated", "courses", "chambers", "churches", "franchises", "agencies", "developers"] as const;
export type GroupId = (typeof GROUP_IDS)[number];

/** A live demo website: a sample business built on the theme, opened on WordPress Playground in the prospect's browser. */
export type KitDemo = { kit: string; business: string; kind: string; url: string };

/** A kit's demo on our own Playground, built from the theme release the demo page uses (lib/demos.ts), never an old one. */
const playground = (kit: string) => {
  const demo = SITE_DEMOS.find((d) => d.id === kit);
  if (!demo) throw new Error(`No demo for the ${kit} kit in lib/demos.ts`);
  return playgroundUrl(demo);
};

/** Every finished demo. A kit gets one here once its demo passes the theme's kit checklist. */
const DEMOS: KitDemo[] = [
  { kit: "ridge", business: "Clearwater Plumbing & Heating", kind: "Plumber", url: playground("ridge") },
  { kit: "circuit", business: "Brightline Electric", kind: "Electrician", url: playground("circuit") }
];

/** Which demos to show each group, best fit first. Groups without their own demo yet show none. */
const GROUP_DEMOS: Record<GroupId, string[]> = {
  shops: [],
  regulated: [],
  courses: [],
  chambers: [],
  churches: [],
  franchises: ["ridge", "circuit"],
  agencies: ["ridge", "circuit"],
  developers: ["ridge", "circuit"]
};

export const demosFor = (group: GroupId): KitDemo[] => GROUP_DEMOS[group].map((kit) => DEMOS.find((d) => d.kit === kit)!).filter(Boolean);

/** Every playbook has these parts, in this order. */
export const PARTS = ["Who", "Where to find them", "What to lead with", "Offer", "Outreach", "Objections", "Demo"] as const;

export type Section = { title: string; body: string };

export type Playbook = {
  id: GroupId;
  title: string;
  plan: Plan;
  /** Google Places business types to search, for the prospect finder. */
  finder: string[];
  sections: Section[];
};

export type Guide = { id: string; title: string; body: string };

/** Splits `---` front matter (key: value, key: [a, b]) from the body. */
function frontMatter(source: string): { data: Record<string, string | string[]>; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(source);
  if (!match) return { data: {}, body: source };
  const data: Record<string, string | string[]> = {};
  for (const line of match[1]!.split("\n")) {
    const at = line.indexOf(":");
    if (at < 0) continue;
    const key = line.slice(0, at).trim();
    const value = line.slice(at + 1).trim();
    data[key] = value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1).split(",").map((v) => v.trim()).filter(Boolean) : value;
  }
  return { data, body: source.slice(match[0].length) };
}

/** The body's `## ` sections, in order. */
function sections(body: string): Section[] {
  const out: Section[] = [];
  for (const chunk of body.split(/^## /m).slice(1)) {
    const newline = chunk.indexOf("\n");
    out.push({ title: chunk.slice(0, newline).trim(), body: chunk.slice(newline + 1).trim() });
  }
  return out;
}

export function parsePlaybook(source: string): Playbook {
  const { data, body } = frontMatter(source);
  return {
    id: data.id as GroupId,
    title: String(data.title ?? data.id),
    plan: data.plan as Plan,
    finder: Array.isArray(data.finder) ? data.finder : [],
    sections: sections(body)
  };
}

export function parseGuide(source: string): Guide {
  const { data, body } = frontMatter(source);
  const prices = body.replace(PLACEHOLDER, (all, name: string) => priceText(name) ?? all);
  return { id: String(data.id), title: String(data.title ?? data.id), body: prices.trim() };
}

/** One message to copy: an email (with its subject), a text, or a social message. */
export type Message = { kind: "email" | "text" | "social"; title: string; subject: string | null; body: string };

/** The Outreach section's emails, texts and social messages, each ready to copy. */
export function messages(outreach: string): Message[] {
  const out: Message[] = [];
  for (const chunk of outreach.split(/^### /m).slice(1)) {
    const newline = chunk.indexOf("\n");
    const title = chunk.slice(0, newline).trim();
    const body = chunk.slice(newline + 1).trim();
    if (/^texts$/i.test(title)) {
      for (const line of body.split("\n")) {
        const text = /^\d+\.\s+(.*)$/.exec(line.trim());
        if (text) out.push({ kind: "text", title: `Text ${out.filter((m) => m.kind === "text").length + 1}`, subject: null, body: text[1]! });
      }
    } else if (/social/i.test(title)) {
      for (const para of body.split(/\n\s*\n/)) {
        const social = /^\*\*(.+?):\*\*\s*([\s\S]*)$/.exec(para.trim());
        if (social) out.push({ kind: "social", title: social[1]!, subject: null, body: social[2]!.trim() });
      }
    } else {
      const subject = /^Subject:\s*(.*)$/m.exec(body);
      out.push({ kind: "email", title, subject: subject ? subject[1]!.trim() : null, body: body.replace(/^Subject:.*\n+/m, "").trim() });
    }
  }
  return out;
}

/** What the Sell page knows about the seller; anything left out stays a placeholder for them to fill. */
export type KitContext = {
  brand: string;
  shop: string | null;
  sender: string | null;
  support: string | null;
  demo: string | null;
  prices: Record<Plan, number>;
  /** The playbook's plan, for {{plan}} and {{price}} in the call script. */
  plan?: Plan;
};

const PLACEHOLDER = /\{\{\s*([a-z.]+)\s*\}\}/g;

/** The value for one placeholder, or null when the seller fills it in per message. */
function valueFor(name: string, ctx: KitContext): string | null {
  if (name.startsWith("price.")) {
    const plan = name.slice(6) as Plan;
    return plan in ctx.prices ? `$${ctx.prices[plan]}` : null;
  }
  switch (name) {
    case "brand":
      return ctx.brand;
    case "shop":
      return ctx.shop;
    case "sender":
      return ctx.sender;
    case "support":
      return ctx.support;
    case "demo":
      return ctx.demo;
    case "plan":
      return ctx.plan ? PLAN_NAMES[ctx.plan] : null;
    case "price":
      return ctx.plan ? `$${ctx.prices[ctx.plan]}` : null;
    default:
      return null;
  }
}

/** A label for a placeholder the seller fills in, such as [prospect]. */
const blank = (name: string) => `[${name}]`;

/** The text with every known placeholder filled and the rest left as [name] for the seller. */
export function fill(text: string, ctx: KitContext): string {
  return text.replace(PLACEHOLDER, (_, name: string) => valueFor(name, ctx) ?? blank(name));
}

/** The text split into plain parts and placeholders, so the page can mark what the seller still has to fill. */
export function fillParts(text: string, ctx: KitContext): { text: string; blank: boolean }[] {
  const parts: { text: string; blank: boolean }[] = [];
  let last = 0;
  for (const match of text.matchAll(PLACEHOLDER)) {
    if (match.index! > last) parts.push({ text: text.slice(last, match.index), blank: false });
    const value = valueFor(match[1]!, ctx);
    parts.push(value === null ? { text: blank(match[1]!), blank: true } : { text: value, blank: false });
    last = match.index! + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), blank: false });
  return parts;
}

/** A whole playbook as one Markdown file in the seller's brand, for the download. */
export function playbookMarkdown(playbook: Playbook, ctx: KitContext): string {
  const filled = (s: string) => fill(s, { ...ctx, plan: playbook.plan });
  return [
    `# ${playbook.title}: sales playbook`,
    `${ctx.brand}. Suggested plan: ${PLAN_NAMES[playbook.plan]} at $${ctx.prices[playbook.plan]} a month.`,
    ...playbook.sections.map((s) => `## ${s.title}\n\n${filled(s.body)}`)
  ].join("\n\n") + "\n";
}

/** The pitch from a playbook's "What to lead with": the pain, the one-line answer and the three things to show. */
export type Pitch = { pain: string; answer: string; show: string[] };

export function pitch(playbook: Playbook): Pitch {
  const lead = playbook.sections.find((s) => s.title === "What to lead with")?.body ?? "";
  const field = (name: string) => new RegExp(`\\*\\*${name}:\\*\\*\\s*(.+)`).exec(lead)?.[1]?.trim() ?? "";
  const show = [...lead.matchAll(/^\d+\.\s+(.+)$/gm)].map((m) => m[1]!.trim());
  return { pain: field("Their pain"), answer: field("Your answer").replace(/^"|"$/g, ""), show };
}

/**
 * The shop address to put in front of a seller's customers, or null. A storefront still on its free platform address
 * (<name>.anypress.site) would name the platform, so the kit leaves it out until the seller connects their own domain.
 */
export function customerFacingShop(domain: string | null | undefined): string | null {
  if (!domain || /(^|\.)anypress\.(site|io)$/i.test(domain)) return null;
  return `https://${domain}`;
}

/** One step of a group's outreach plan: what to send or do, and on which day. */
export type Step = {
  /** 0 is "before you start" (a post on your own page); otherwise the day of the campaign. */
  day: number;
  channel: "email" | "text" | "social" | "call" | "post";
  title: string;
  message: Message | null;
};

/** When each email and text goes out, following the timing the playbooks' emails are written for. */
const EMAIL_DAYS = [1, 4, 11, 25, 32];
const TEXT_DAYS = [2, 12, 32];
const CALL_DAY = 6;

/**
 * A playbook's outreach as a day-by-day plan: emails and texts on their days, the direct message on day 1, the call
 * on day 6, and any post for the seller's own page before they start.
 */
export function campaign(playbook: Playbook): Step[] {
  const all = messages(playbook.sections.find((s) => s.title === "Outreach")?.body ?? "");
  const steps: Step[] = [];
  const emails = all.filter((m) => m.kind === "email");
  const texts = all.filter((m) => m.kind === "text");
  const socials = all.filter((m) => m.kind === "social");
  for (const m of socials) {
    const post = /post/i.test(m.title);
    steps.push({ day: post ? 0 : 1, channel: post ? "post" : "social", title: m.title, message: m });
  }
  emails.forEach((m, i) => steps.push({ day: EMAIL_DAYS[i] ?? 32 + i, channel: "email", title: m.title.replace(/^Email \d+:\s*/i, ""), message: m }));
  texts.forEach((m, i) => steps.push({ day: TEXT_DAYS[i] ?? 32 + i, channel: "text", title: m.title, message: m }));
  steps.push({ day: CALL_DAY, channel: "call", title: "Call to book a demo", message: null });
  const order: Record<Step["channel"], number> = { post: 0, social: 1, email: 2, text: 3, call: 4 };
  return steps.sort((a, b) => a.day - b.day || order[a.channel] - order[b.channel]);
}

/**
 * What one Small site costs a month: the list price for a seller (before volume savings), or the list price less the
 * reseller's wholesale discount, as its monthly bill charges it. Rounded to cents.
 */
export const cost = (plan: Plan, wholesalePercent: number | null) =>
  Math.round(LIST_COST[plan] * (100 - (wholesalePercent ?? 0))) / 100;

/** What the seller or reseller keeps a month on one site at a given price. */
export const keep = (plan: Plan, price: number, wholesalePercent: number | null) => Math.max(0, Math.round((price - cost(plan, wholesalePercent)) * 100) / 100);

/** Dollars without cents when they're whole: 7.2 is "7.20", 12 is "12". */
export const dollars = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/** FluentCRM fills these per contact: a prospect's first name is the business's name. */
const SMARTCODES: Record<string, string> = { prospect: "there", business: "{{contact.first_name}}" };
const BLANK = /\[([a-z.]+)\]/g;

/** The group's email steps as FluentCRM emails, and the blanks the seller still has to fill in there. */
export function outreachEmails(group: string, steps: Step[], ctx: KitContext): { input: ProspectAutomationInput; blanks: string[] } {
  const prefill = (text: string) => fill(text.replace(/\{\{\s*(prospect|business)\s*\}\}/g, (_, name: string) => `\u0000${name}\u0000`), ctx).replace(/\u0000([a-z]+)\u0000/g, (_, name: string) => SMARTCODES[name]!);
  const emails = steps
    .filter((s) => s.channel === "email" && s.message)
    .map((s) => ({ day: Math.max(1, s.day), subject: prefill(s.message!.subject ?? s.title), body: prefill(s.message!.body) }));
  const blanks = [...new Set(emails.flatMap((e) => [...`${e.subject}\n${e.body}`.matchAll(BLANK)].map((m) => m[1]!)))];
  const note = blanks.length
    ? `Before you turn this on, replace ${blanks.map((b) => `[${b}]`).join(", ").replace(/, ([^,]+)$/, " and $1")} in each email. Prospects tagged Replied or Customer stop getting these emails.`
    : "Prospects tagged Replied or Customer stop getting these emails.";
  return { input: { group, note, emails }, blanks };
}
