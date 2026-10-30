import { describe, expect, it } from "vitest";

import { toMoveIn, toSiteReport } from "./wire";

const base = { expiresAt: "2026-11-05T10:00:00.000Z", startedAt: "2026-10-29T10:00:00.000Z", source: { home: "https://old.example" } };

describe("toMoveIn", () => {
  it("keeps a failed move's reason and the warnings", () => {
    const moveIn = toMoveIn({
      ...base,
      reason: "The export is missing its database or its files. Run the export again on the old site.",
      warnings: ["The old site ran PHP 8.1 and this store runs PHP 8.3. Check that its plugins and theme work."],
      check: { ok: false, home: 500, login: 200, loaded: false, fatal: null }
    });
    expect(moveIn.reason).toBe("The export is missing its database or its files. Run the export again on the old site.");
    expect(moveIn.warnings).toEqual(["The old site ran PHP 8.1 and this store runs PHP 8.3. Check that its plugins and theme work."]);
    expect(moveIn.source).toEqual({ home: "https://old.example" });
  });

  it("answers no reason and no warnings when the API sends none", () => {
    expect(toMoveIn({ ...base, startedAt: null, source: null })).toEqual({
      expiresAt: base.expiresAt,
      startedAt: null,
      source: null,
      reason: null,
      warnings: [],
      siteReport: null
    });
  });

  it("drops blank reasons and warnings", () => {
    const moveIn = toMoveIn({ ...base, reason: "  ", warnings: ["", "  Check the theme.  "] });
    expect(moveIn.reason).toBeNull();
    expect(moveIn.warnings).toEqual(["Check the theme."]);
  });
});

describe("toSiteReport", () => {
  const item = {
    area: "forms",
    plugin: "Contact Form 7",
    slug: "contact-form-7",
    version: "6.1",
    counts: [{ name: "entries", count: 1204, label: "1,204 entries" }, { name: "bad", count: "3", label: "3 bad" }],
    fluentRoute: "native",
    fluentPlugin: "Fluent Forms",
    onFluent: false,
    needsPro: true,
    route: "Needs Fluent Forms Pro",
    willLose: ["Hidden fields.", " "],
    blockers: ["Flamingo is off."]
  };

  it("keeps the report's items, plugins and notes from the move", () => {
    const moveIn = toMoveIn({ ...base, siteReport: { items: [item], plugins: [{ slug: "akismet", name: "Akismet", version: "5.5" }], notes: ["The store couldn't count what Gravity Forms holds."] } });
    expect(moveIn.siteReport).toEqual({
      items: [{ ...item, counts: [{ name: "entries", count: 1204, label: "1,204 entries" }], willLose: ["Hidden fields."] }],
      plugins: [{ slug: "akismet", name: "Akismet", version: "5.5" }],
      notes: ["The store couldn't count what Gravity Forms holds."]
    });
  });

  it("drops items of an unknown area or route, and answers null without a report", () => {
    expect(toSiteReport({ items: [{ ...item, area: "games" }, { ...item, fluentRoute: "teleport" }] })).toEqual({ items: [], plugins: [], notes: [] });
    expect(toSiteReport(undefined)).toBeNull();
    expect(toSiteReport("report")).toBeNull();
  });
});
