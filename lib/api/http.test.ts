import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { HttpAdminApi } from "./http";

const access = async () => ({ prefix: "/admin" as const, headers: { Authorization: "Bearer test" } });

afterEach(() => vi.unstubAllGlobals());

describe("webhookDeliveries", () => {
  it("asks for the pages after the first at once, and keeps them in order", async () => {
    const total = 1000;
    let open = 0;
    let mostOpen = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL) => {
        const page = Number(url.searchParams.get("page"));
        open++;
        mostOpen = Math.max(mostOpen, open);
        await new Promise((resolve) => setTimeout(resolve, page === 1 ? 0 : 20));
        open--;
        const items = Array.from({ length: 200 }, (_, i) => ({ id: `${page}-${i}` }));
        return new Response(JSON.stringify({ items, total, page, pageSize: 200 }), { status: 200 });
      })
    );
    const api = new HttpAdminApi("https://api.example", access);
    const { items, total: answered } = await api.webhookDeliveries();
    expect(answered).toBe(total);
    expect(items).toHaveLength(1000);
    expect(items[0]).toMatchObject({ id: "1-0" });
    expect(items[999]).toMatchObject({ id: "5-199" });
    expect(mostOpen).toBe(4);
  });
});
