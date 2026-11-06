import { afterEach, describe, expect, it } from "vitest";

import { INTEGRATION_GROUPS, publicApiUrl } from "./integrations";

const items = INTEGRATION_GROUPS.flatMap((g) => g.items);

describe("integrations", () => {
  it("lists every integration a seller can use, the MCP connector included", () => {
    expect(items.map((i) => i.id)).toEqual(expect.arrayContaining(["n8n", "zapier", "make", "highlevel", "mcp", "storefront", "crm", "api", "webhooks"]));
  });

  it("gives each one a guide on the shop's docs, and keeps dashboard links inside the dashboard", () => {
    for (const item of items) {
      expect(item.guide.href, item.id).toMatch(/^https:\/\/shop\.anypress\.io\/docs\/[a-z0-9-]+\/$/);
      if (item.action) expect(item.action.href, item.id).toMatch(/^(\/[a-z]+|https:\/\/)/);
    }
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  it("never says WPCS", () => {
    expect(JSON.stringify(INTEGRATION_GROUPS)).not.toMatch(/wpcs/i);
  });
});

describe("publicApiUrl", () => {
  afterEach(() => {
    delete process.env.WAAS_PUBLIC_API_URL;
  });

  it("is api.anypress.io unless a self-hoster sets their own", () => {
    expect(publicApiUrl()).toBe("https://api.anypress.io");
    process.env.WAAS_PUBLIC_API_URL = "https://api.example.com/";
    expect(publicApiUrl()).toBe("https://api.example.com");
  });
});
