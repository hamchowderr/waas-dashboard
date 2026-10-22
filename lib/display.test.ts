import { describe, expect, it } from "vitest";

import { replyText, urlHost } from "./display";

describe("urlHost", () => {
  it("keeps only the host", () => {
    expect(urlHost("https://shop.example.com/wp-json/waas/v1/webhook")).toBe("shop.example.com");
    expect(urlHost("not a url")).toBe("not a url");
  });
});

describe("replyText", () => {
  it("turns an HTML error page into its words", () => {
    expect(replyText("<html><body><h1>502 Bad Gateway</h1></body></html>")).toBe("502 Bad Gateway");
    expect(replyText("<html><head><title>Service Unavailable</title></head><body>…</body></html>")).toBe(
      "Service Unavailable"
    );
  });

  it("leaves plain replies alone and cuts long ones", () => {
    expect(replyText("Internal Server Error")).toBe("Internal Server Error");
    expect(replyText("x".repeat(200), 10)).toBe(`${"x".repeat(9)}…`);
    expect(replyText(null)).toBe("");
  });
});
