import { describe, expect, it } from "vitest";

import { NAV, linkHref, navFor, sectionOf } from "./nav";

const link = (href: string) => NAV.flatMap((g) => g.links).find((l) => l.href === href)!;

describe("navFor", () => {
  it("leaves the platform admin's pages and the empty sections out for a customer", () => {
    const groups = navFor(false);
    expect(groups.map((g) => g.title)).toEqual(["Overview", "Stores", "Store designs", "Team and brand", "Developers"]);
    expect(groups.flatMap((g) => g.links).some((l) => l.adminOnly)).toBe(false);
  });

  it("shows the platform admin every page but a reseller team's own", () => {
    const links = navFor(true).flatMap((g) => g.links);
    expect(links).toHaveLength(NAV.flatMap((g) => g.links).length - 1);
    expect(links.some((l) => l.resellerOnly)).toBe(false);
  });

  it("gives a reseller's team its Reseller account, and no admin Accounts", () => {
    const titles = navFor(false, true).map((g) => g.title);
    expect(titles).toContain("Reseller account");
    expect(titles).not.toContain("Accounts");
  });

  it("keeps the sidebar short: one link per section", () => {
    expect(navFor(true).length).toBeLessThanOrEqual(7);
  });
});

describe("sectionOf", () => {
  it("finds the section of a page and of the pages below it", () => {
    expect(sectionOf("/backups", false)?.links.map((l) => l.href)).toEqual(["/stores", "/backups", "/jobs"]);
    expect(sectionOf("/stores/t-1", false)?.title).toBe("Stores");
    expect(sectionOf("/", false)?.title).toBe("Overview");
  });

  it("shows a customer only the tabs they may open", () => {
    expect(sectionOf("/storefronts", false)).toBeNull();
    expect(sectionOf("/storefronts", true)?.links).toHaveLength(3);
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
