import { describe, expect, it } from "vitest";

import { settingLabel } from "./format";

describe("settingLabel", () => {
  it("names the settings our stores are made with", () => {
    expect(settingLabel("blogname")).toBe("Site title");
    expect(settingLabel("DISALLOW_FILE_EDIT")).toBe("File editor turned off");
  });

  it("spells out names it doesn't know", () => {
    expect(settingLabel("WP_CACHE_KEY_SALT")).toBe("Cache key salt");
    expect(settingLabel("my_shop_colour")).toBe("My shop colour");
  });
});
