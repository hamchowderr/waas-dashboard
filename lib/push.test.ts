import { describe, expect, it } from "vitest";

import { keyBytes, needsHomeScreen } from "./push";

describe("push helpers", () => {
  it("turns a URL-safe base64 key into its bytes", () => {
    expect(Array.from(keyBytes("AQID_-8"))).toEqual([1, 2, 3, 255, 239]);
  });

  it("asks iPhone users to add the dashboard to the Home Screen first", () => {
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
    expect(needsHomeScreen(iphone, false)).toBe(true);
    expect(needsHomeScreen(iphone, true)).toBe(false);
    expect(needsHomeScreen("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0", false)).toBe(false);
  });
});
