/**
 * The sales kit in content/sales-kit: one playbook per customer group and the shared guides, as Markdown with
 * {{placeholders}}. Parsing and filling are pure, so the Sell page can fill them in the browser as prices change;
 * reading the files is in lib/sales-kit-files.ts (server only).
 */

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

/** The seller's cost per site, Small, monthly, at list price, in whole dollars. */
export const LIST_COST: Record<Plan, number> = { website: 12, bookings: 19, store: 29, community: 39, everything: 79 };

/** The groups in the order the Sell page shows them; ids match the CRM's customer group field. */
export const GROUP_IDS = ["shops", "regulated", "courses", "chambers", "churches", "franchises", "agencies", "developers"] as const;
export type GroupId = (typeof GROUP_IDS)[number];

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
export function frontMatter(source: string): { data: Record<string, string | string[]>; body: string } {
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
export function sections(body: string): Section[] {
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
  return { id: String(data.id), title: String(data.title ?? data.id), body: body.trim() };
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
export function valueFor(name: string, ctx: KitContext): string | null {
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
export const blank = (name: string) => `[${name}]`;

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
