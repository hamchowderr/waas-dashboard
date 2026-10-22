import { describe, expect, it } from "vitest";

import { installsLabel, siteTypesLabel } from "./plugin-choices";

describe("plugin choices", () => {
  it("names the site types a choice lists", () => {
    expect(siteTypesLabel([])).toBe("All site types");
    expect(siteTypesLabel(["website", "online-store"])).toBe("Website, Online store");
    // Everything covers the stores bought before site types too.
    expect(siteTypesLabel(["everything", "store"])).toBe("Everything");
    expect(siteTypesLabel(["website", "members"])).toBe("Website, members");
  });

  it("rounds active installs as wordpress.org does", () => {
    expect(installsLabel(10_000_000)).toBe("10M+");
    expect(installsLabel(700_000)).toBe("700K+");
    expect(installsLabel(40)).toBe("40+");
    expect(installsLabel(0)).toBe("Fewer than 10");
  });
});
