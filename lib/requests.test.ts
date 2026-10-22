import { describe, expect, it } from "vitest";

import { describeRequest, madeWith, windowStart } from "./requests";

describe("request log helpers", () => {
  it("turns a time choice into the time it starts at, and anything else into the whole log", () => {
    const now = Date.parse("2026-10-15T12:00:00Z");
    expect(windowStart("hour", now)).toBe("2026-10-15T11:00:00.000Z");
    expect(windowStart("day", now)).toBe("2026-10-14T12:00:00.000Z");
    expect(windowStart("week", now)).toBe("2026-10-08T12:00:00.000Z");
    expect(windowStart(undefined, now)).toBeUndefined();
    expect(windowStart("toString", now)).toBeUndefined();
  });

  it("names what made a call", () => {
    const key = "3f6c1a2b-0000-4000-8000-000000000000";
    expect(madeWith({ source: "v1", apiKeyId: key, apiKeyLabel: "Shop plugin", userId: null })).toBe("Shop plugin");
    expect(madeWith({ source: "v1", apiKeyId: key, apiKeyLabel: null, userId: null })).toBe("Key 3f6c1a2b");
    expect(madeWith({ source: "account", apiKeyId: null, apiKeyLabel: null, userId: key })).toBe("Signed-in person");
    expect(madeWith({ source: "admin", apiKeyId: null, apiKeyLabel: null, userId: null })).toBe("Platform admin");
    expect(madeWith({ source: "v1", apiKeyId: null, apiKeyLabel: null, userId: null })).toBe("No key");
  });
});

describe("describeRequest", () => {
  const id = "00000003-0000-4000-8000-0000000735f7";
  it("names known calls in plain words", () => {
    expect(describeRequest({ method: "GET", path: "/v1/tenants" })).toBe("Listed stores");
    expect(describeRequest({ method: "GET", path: "/v1/tenants", query: "externalId=sub_1" })).toBe(
      "Looked up a store by subscription"
    );
    expect(describeRequest({ method: "POST", path: `/v1/tenants/${id}/backups` })).toBe("Backed up a store");
    expect(describeRequest({ method: "PUT", path: `/admin/tenants/${id}/domains/main` })).toBe("Changed a store's address");
    expect(describeRequest({ method: "GET", path: "/v1/plugins/waas-host/update" })).toBe("Checked for a plugin update");
  });

  it("falls back to the verb and the last part of the path", () => {
    expect(describeRequest({ method: "GET", path: "/v1/something-new" })).toBe("Looked up something new");
    expect(describeRequest({ method: "DELETE", path: `/admin/widgets/${id}` })).toBe("Removed widgets");
  });
});
