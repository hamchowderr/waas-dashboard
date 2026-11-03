import { describe, expect, it } from "vitest";

import { pageWindow } from "./data-table";

describe("pageWindow", () => {
  it("shows every page when there are only a few", () => {
    expect(pageWindow(0, 5)).toEqual([0, 1, 2, 3, 4]);
  });

  it("keeps a long list to a handful of numbers with gaps", () => {
    expect(pageWindow(6, 100)).toEqual([0, null, 5, 6, 7, null, 99]);
    expect(pageWindow(0, 100)).toEqual([0, 1, 2, 3, 4, null, 99]);
    expect(pageWindow(99, 100)).toEqual([0, null, 95, 96, 97, 98, 99]);
  });
});
