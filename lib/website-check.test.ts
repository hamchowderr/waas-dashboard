import { describe, expect, it } from "vitest";

import { isPrivateAddress, normalizeUrl, reportEmail, type Report } from "./website-check";

describe("helpers", () => {
  it("turns what a seller types into a web address", () => {
    expect(normalizeUrl("joes.example")?.href).toBe("https://joes.example/");
    expect(normalizeUrl("http://joes.example/about")?.href).toBe("http://joes.example/about");
    expect(normalizeUrl("ftp://joes.example")).toBeNull();
    expect(normalizeUrl("localhost")).toBeNull();
    expect(normalizeUrl("https://joes.example:8080")).toBeNull();
    expect(normalizeUrl("https://user:pw@joes.example")).toBeNull();
  });

  it("refuses private and local addresses", () => {
    for (const ip of ["127.0.0.1", "10.0.0.5", "172.20.1.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"])
      expect(isPrivateAddress(ip), ip).toBe(true);
    for (const ip of ["8.8.8.8", "172.32.0.1", "2606:4700::1111"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });
});

describe("reportEmail", () => {
  it("names the score and the worst problems first", () => {
    const r: Report = {
      url: "http://joes.example/",
      host: "joes.example",
      checkedAt: "2026-11-03T12:00:00.000Z",
      score: 31,
      builder: null,
      checks: [
        { id: "secure", title: "Secure connection", status: "fail", weight: 3, detail: "The site doesn't use a secure connection." },
        { id: "heading", title: "Clear main heading", status: "warn", weight: 1, detail: "The page has no main heading." },
        { id: "contact", title: "Easy to contact", status: "fail", weight: 2, detail: "There's no tap-to-call number." },
        { id: "mobile", title: "Works on phones", status: "pass", weight: 3, detail: "The site fits phone screens." }
      ]
    };
    const email = reportEmail(r, { sender: "Sam", brand: "Summit Sites" });
    expect(email).toContain(`scored ${r.score} out of 100`);
    expect(email.indexOf("- Secure connection")).toBeLessThan(email.indexOf("- Easy to contact"));
    expect(email.indexOf("- Easy to contact")).toBeLessThan(email.indexOf("- Clear main heading"));
    expect(email).not.toContain("Works on phones");
    expect(email.trim().endsWith("Summit Sites")).toBe(true);
    expect(email).not.toMatch(/anypress/i);
  });
});
