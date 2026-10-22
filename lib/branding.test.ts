import { describe, expect, it } from "vitest";

import { brandColorVars, foregroundFor } from "./branding";

describe("brand colors", () => {
  it("puts white on dark colors and near-black on light ones", () => {
    expect(foregroundFor("#1d4ed8")).toBe("#ffffff");
    expect(foregroundFor("#000000")).toBe("#ffffff");
    expect(foregroundFor("#fde047")).toBe("#0a0a0a");
    expect(foregroundFor("#ffffff")).toBe("#0a0a0a");
  });

  it("sets the accent variables, and nothing without a valid color", () => {
    expect(brandColorVars("#0f766e")).toMatchObject({ "--primary": "#0f766e", "--primary-foreground": "#ffffff", "--sidebar-primary": "#0f766e" });
    expect(brandColorVars(null)).toEqual({});
    expect(brandColorVars("red; background: url(x)")).toEqual({});
  });
});
