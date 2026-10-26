import { describe, expect, it } from "vitest";

import { NAV, linkHref, navFor } from "./nav";

const link = (href: string) => NAV.flatMap((g) => g.links).find((l) => l.href === href)!;

describe("navFor", () => {
  it("leaves the platform admin's pages and the empty Accounts group out for a customer", () => {
    const groups = navFor(false);
    expect(groups.map((g) => g.title)).toEqual(["Stores", "Storefront setup", "Developers"]);
    expect(groups.flatMap((g) => g.links).some((l) => l.adminOnly)).toBe(false);
  });

  it("shows every page to the platform admin", () => {
    expect(navFor(true).flatMap((g) => g.links)).toHaveLength(NAV.flatMap((g) => g.links).length);
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
