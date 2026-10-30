import { describe, expect, it } from "vitest";

import { toMoveIn } from "./wire";

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
      warnings: []
    });
  });

  it("drops blank reasons and warnings", () => {
    const moveIn = toMoveIn({ ...base, reason: "  ", warnings: ["", "  Check the theme.  "] });
    expect(moveIn.reason).toBeNull();
    expect(moveIn.warnings).toEqual(["Check the theme."]);
  });
});
