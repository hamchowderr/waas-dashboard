import { describe, expect, it } from "vitest";

import { settingLabel } from "./format";

describe("settingLabel", () => {
  it("names the settings our stores are made with", () => {
    expect(settingLabel("blogname")).toBe("Site title");
    expect(settingLabel("DISALLOW_FILE_EDIT")).toBe("File editor turned off");
  });

  it("names the shop's settings the same under the old and new spellings", () => {
    expect(settingLabel("WAAS_TENANT_ROLES")).toBe("Plan roles");
    expect(settingLabel("WPCS_TENANT_ROLES")).toBe("Plan roles");
    expect(settingLabel("WPCS_PUBLIC_KEY")).toBe("One-click sign-in key");
    expect(settingLabel("WPCS_TENANT_NO_ADMINISTRATOR_PLUGIN_CAPS")).toBe("Plugins managed by the plan");
    expect(settingLabel("wpcs_host_settings_root_domain")).toBe("Website domain");
    expect(settingLabel("WAAS_SOMETHING_NEW")).toBe("Something new");
  });

  it("spells out names it doesn't know", () => {
    expect(settingLabel("WP_CACHE_KEY_SALT")).toBe("Cache key salt");
    expect(settingLabel("my_shop_colour")).toBe("My shop colour");
  });
});
