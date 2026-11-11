import { describe, expect, it } from "vitest";

import { NAV } from "@/components/shell/nav";
import { sectionSlug, tourFor } from "@/components/shell/tours";

const ids = (kind: "admin" | "seller" | "reseller", canChange = true, product: string | null = null) =>
  tourFor({ kind, product, canChange }).steps.map((step) => step.id);

describe("tourFor", () => {
  it("walks each kind of account through its own pages", () => {
    expect(ids("admin")).toEqual([
      "needs-you",
      "sidebar-nav",
      "storefront-picker",
      "group-websites",
      "store-actions",
      "group-store-setup",
      "group-accounts",
      "group-developers",
      "account-menu"
    ]);
    expect(ids("seller")).toEqual([
      "start-here",
      "sidebar-nav",
      "group-websites",
      "store-actions",
      "group-store-setup",
      "group-developers",
      "account-menu"
    ]);
    expect(ids("reseller")).toContain("nav-reseller-account");
  });

  it("leaves out the step about buttons a view-only member can't use", () => {
    expect(ids("seller", false)).not.toContain("store-actions");
  });

  it("links each page to the next and back, keeping the picked storefront", () => {
    const steps = tourFor({ kind: "admin", product: "p1", canChange: true }).steps;
    const byId = Object.fromEntries(steps.map((step) => [step.id, step]));
    expect(byId["storefront-picker"].nextRoute).toBe("/stores?product=p1");
    expect(byId["group-websites"].previousRoute).toBe("/?product=p1");
    expect(byId["store-actions"].nextRoute).toBe("/versions?product=p1");
    // Storefronts is about every storefront, so it doesn't carry one.
    expect(byId["group-store-setup"].nextRoute).toBe("/storefronts");
    expect(byId["sidebar-nav"].nextRoute).toBeUndefined();
    expect(byId["account-menu"].nextRoute).toBeUndefined();
  });

  it("points at sidebar groups and links that exist", () => {
    const anchors = new Set([
      ...NAV.filter((section) => !section.inAccountMenu).map((section) => `group-${sectionSlug(section.title)}`),
      ...NAV.filter((section) => !section.inAccountMenu).flatMap((section) => section.links.map((link) => `nav-${sectionSlug(link.title)}`))
    ]);
    for (const kind of ["admin", "seller", "reseller"] as const) {
      for (const id of ids(kind)) if (id.startsWith("group-") || id.startsWith("nav-")) expect(anchors).toContain(id);
    }
  });
});
