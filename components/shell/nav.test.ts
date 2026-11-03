import { describe, expect, it } from "vitest";

import { ALL_LINKS, NAV, linkHref, navFor } from "./nav";

const link = (href: string) => ALL_LINKS.find((l) => l.href === href)!;

describe("navFor", () => {
  it("leaves the platform admin's pages and the empty groups out for a customer", () => {
    const groups = navFor(false);
    expect(groups.map((g) => g.title)).toEqual(["Overview", "Websites", "Store Setup", "Settings", "Developers"]);
    expect(groups.flatMap((g) => g.links).some((l) => l.adminOnly)).toBe(false);
  });

  it("shows the platform admin every page but a reseller team's own", () => {
    const links = navFor(true).flatMap((g) => g.links);
    expect(links).toHaveLength(ALL_LINKS.length - 1);
    expect(links.some((l) => l.resellerOnly)).toBe(false);
  });

  it("gives a reseller's team its Reseller Account, and none of the admin's accounts pages", () => {
    const accounts = navFor(false, true).find((g) => g.title === "Accounts");
    expect(accounts?.links.map((l) => l.title)).toEqual(["Reseller Account"]);
  });
});

describe("names", () => {
  it("writes every group and page in Title Case, with a line on what it is for", () => {
    const minor = new Set(["and", "of", "the", "a", "to"]);
    for (const title of [...NAV.map((g) => g.title), ...ALL_LINKS.map((l) => l.title)]) {
      for (const word of title.split(" ")) if (!minor.has(word)) expect(word[0], title).toBe(word[0]!.toUpperCase());
    }
    for (const l of ALL_LINKS) expect(l.description.length).toBeGreaterThan(10);
  });
});

describe("linkHref", () => {
  it("keeps the picked storefront on a storefront's pages", () => {
    expect(linkHref(link("/jobs"), "abc")).toBe("/jobs?product=abc");
  });

  it("drops it on pages about every storefront, and when none is picked", () => {
    expect(linkHref(link("/resellers"), "abc")).toBe("/resellers");
    expect(linkHref(link("/jobs"), null)).toBe("/jobs");
  });
});
