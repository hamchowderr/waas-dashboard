import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { GROUP_IDS, PARTS, PLANS, SUGGESTED_PRICES, fill, pitch, campaign, customerFacingShop, demosFor, fillParts, messages, parseGuide, parsePlaybook, playbookMarkdown, type KitContext } from "./sales-kit";

const root = path.join(__dirname, "..", "content", "sales-kit");
const read = (...p: string[]) => readFileSync(path.join(root, ...p), "utf8");
const playbooks = GROUP_IDS.map((id) => parsePlaybook(read("groups", `${id}.md`)));

const ctx: KitContext = { brand: "Summit Sites", shop: "https://summit.example", sender: "Sam", support: "help@summit.example", demo: null, prices: SUGGESTED_PRICES };

describe("playbooks", () => {
  it("has one file per customer group, and no others", () => {
    expect(readdirSync(path.join(root, "groups")).sort()).toEqual(GROUP_IDS.map((id) => `${id}.md`).sort());
  });

  it("gives every group the same parts in the same order, a plan and places to search", () => {
    for (const p of playbooks) {
      expect(p.sections.map((s) => s.title), p.id).toEqual([...PARTS]);
      expect(PLANS, p.id).toContain(p.plan);
      expect(p.finder.length, p.id).toBeGreaterThan(3);
    }
  });

  it("has five emails, three texts and a social message in every outreach", () => {
    for (const p of playbooks) {
      const m = messages(p.sections.find((s) => s.title === "Outreach")!.body);
      expect(m.filter((x) => x.kind === "email"), p.id).toHaveLength(5);
      expect(m.filter((x) => x.kind === "email").every((x) => x.subject), p.id).toBe(true);
      expect(m.filter((x) => x.kind === "text"), p.id).toHaveLength(3);
      expect(m.filter((x) => x.kind === "social").length, p.id).toBeGreaterThan(0);
    }
  });
});

describe("the seller's brand only", () => {
  it("never names the platform anywhere in the kit", () => {
    const all = [...GROUP_IDS.map((id) => read("groups", `${id}.md`)), ...readdirSync(path.join(root, "guides")).map((f) => read("guides", f))];
    for (const text of all) expect(text).not.toMatch(/anypress|wpcs/i);
  });

  it("uses only placeholders the README lists", () => {
    const readme = read("README.md");
    const used = new Set<string>();
    for (const text of [...GROUP_IDS.map((id) => read("groups", `${id}.md`)), ...readdirSync(path.join(root, "guides")).map((f) => read("guides", f))])
      for (const m of text.matchAll(/\{\{([a-z.]+)\}\}/g)) used.add(m[1]!);
    for (const name of used) expect(readme, name).toContain(`{{${name}}}`);
  });
});

describe("fill", () => {
  it("fills what the page knows and leaves the rest for the seller", () => {
    expect(fill("Hi {{prospect}}, {{sender}} from {{brand}}: {{price.store}} a month.", ctx)).toBe("Hi [prospect], Sam from Summit Sites: $99 a month.");
    expect(fill("{{plan}} at {{price}}", { ...ctx, plan: "community" })).toBe("Community & courses at $129");
    expect(fill("{{demo}}", ctx)).toBe("[demo]");
  });

  it("marks the parts the seller still fills", () => {
    expect(fillParts("Hi {{prospect}}, from {{brand}}.", ctx)).toEqual([
      { text: "Hi ", blank: false },
      { text: "[prospect]", blank: true },
      { text: ", from ", blank: false },
      { text: "Summit Sites", blank: false },
      { text: ".", blank: false }
    ]);
  });

  it("makes a whole playbook in the seller's brand with no placeholders left but the per-message ones", () => {
    const md = playbookMarkdown(playbooks.find((p) => p.id === "churches")!, ctx);
    expect(md).toContain("# Churches: sales playbook");
    expect(md).toContain("Summit Sites");
    expect(md).not.toMatch(/\{\{/);
  });
});

describe("guides", () => {
  it("reads a guide's title and body", () => {
    const g = parseGuide(read("guides", "pricing.md"));
    expect(g.title).toBe("What to charge");
    expect(g.body).toContain("## Suggested prices");
  });
});

describe("pitch", () => {
  it("finds the pain, the answer and three things to show in every playbook", () => {
    for (const p of playbooks) {
      const { pain, answer, show } = pitch(p);
      expect(pain.length, p.id).toBeGreaterThan(20);
      expect(answer.length, p.id).toBeGreaterThan(20);
      expect(answer, p.id).not.toMatch(/^"|"$/);
      expect(show, p.id).toHaveLength(3);
    }
  });
});

describe("customerFacingShop", () => {
  it("leaves out the platform's own addresses", () => {
    expect(customerFacingShop("summit-sites.anypress.site")).toBeNull();
    expect(customerFacingShop("shop.anypress.io")).toBeNull();
    expect(customerFacingShop(null)).toBeNull();
    expect(customerFacingShop("shop.summitsites.com")).toBe("https://shop.summitsites.com");
  });
});

describe("campaign", () => {
  it("lays every message out by day, with one call", () => {
    for (const p of playbooks) {
      const steps = campaign(p);
      expect(steps.filter((s) => s.channel === "email").map((s) => s.day), p.id).toEqual([1, 4, 11, 25, 32]);
      expect(steps.filter((s) => s.channel === "call"), p.id).toHaveLength(1);
      expect(steps.map((s) => s.day), p.id).toEqual([...steps.map((s) => s.day)].sort((a, b) => a - b));
      expect(steps[0]!.day, p.id).toBeLessThanOrEqual(1);
    }
  });
});

describe("demosFor", () => {
  it("only lists finished demos, as Playground links", () => {
    for (const id of GROUP_IDS)
      for (const d of demosFor(id)) expect(d.url).toMatch(/^https:\/\/playground\.wordpress\.net\/\?blueprint-url=/);
    expect(demosFor("agencies").map((d) => d.kit)).toEqual(["ridge", "circuit"]);
    expect(demosFor("churches")).toEqual([]);
  });
});
