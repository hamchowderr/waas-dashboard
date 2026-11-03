import { describe, expect, it } from "vitest";

import { analyze, builderOf, copyrightYear, isPrivateAddress, normalizeUrl, reportEmail, type Fetched } from "./website-check";

const NOW = new Date("2026-11-03T12:00:00Z");
const page = (html: string, over: Partial<Fetched> = {}): Fetched => ({
  requested: "https://joes.example/",
  finalUrl: "https://joes.example/",
  redirectsToHttps: true,
  status: 200,
  ms: 800,
  bytes: 200_000,
  html,
  ...over
});
const status = (html: string, id: string, over?: Partial<Fetched>) => analyze(page(html, over), NOW).checks.find((c) => c.id === id)?.status;

const GOOD = `<!doctype html><html><head><title>Joe's Plumbing in Columbus, Ohio</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Emergency plumbing, drain cleaning and water heaters in Columbus. Same-day service, 7 days a week.">
<meta property="og:image" content="https://joes.example/og.jpg"><meta name="generator" content="WordPress 6.4"></head>
<body><h1>Plumbing done right</h1><a href="tel:+16145550100">Call</a><a href="/book">Book online</a>
<img src="a.jpg" alt="Van"><img src="b.jpg" alt="Team"><img src="c.jpg" alt="Sink"><footer>&copy; 2026 Joe's</footer></body></html>`;

describe("analyze", () => {
  it("passes a well-kept site", () => {
    const r = analyze(page(GOOD), NOW);
    expect(r.checks.every((c) => c.status === "pass"), JSON.stringify(r.checks.filter((c) => c.status !== "pass"))).toBe(true);
    expect(r.score).toBe(100);
    expect(r.builder).toBe("WordPress");
    expect(r.host).toBe("joes.example");
  });

  it("fails an old, unsecured site that doesn't fit phones", () => {
    const html = `<html><head><title>Home</title></head><body><p>Welcome</p><p>Copyright 2016</p></body></html>`;
    const r = analyze(page(html, { finalUrl: "http://joes.example/", redirectsToHttps: null, ms: 5200 }), NOW);
    const by = Object.fromEntries(r.checks.map((c) => [c.id, c.status]));
    expect(by).toMatchObject({ secure: "fail", speed: "fail", mobile: "fail", fresh: "fail", contact: "fail", online: "warn", heading: "warn" });
    expect(r.checks.find((c) => c.id === "fresh")!.detail).toContain("2016");
    expect(r.score).toBeLessThan(30);
  });

  it("warns when the plain address doesn't go to the secure one", () => {
    expect(status(GOOD, "secure", { redirectsToHttps: false })).toBe("warn");
  });

  it("counts undescribed pictures only when there are a few", () => {
    expect(status(`<img src=a><img src=b><img src=c alt="x">`, "images")).toBe("fail");
    expect(status(`<img src=a>`, "images")).toBeUndefined();
  });
});

describe("helpers", () => {
  it("finds the builder and the newest copyright year", () => {
    expect(builderOf(`<link href="https://static.wixstatic.com/x.css">`)).toBe("Wix");
    expect(builderOf(`<p>hi</p>`)).toBeNull();
    expect(copyrightYear(`<p>&copy; 2018-2021 Joe</p>`)).toBe(2021);
    expect(copyrightYear(`<p>no year</p>`)).toBeNull();
  });

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
    const r = analyze(page(`<html><head><title>Home</title></head><body>© 2015</body></html>`, { finalUrl: "http://joes.example/" }), NOW);
    const email = reportEmail(r, { sender: "Sam", brand: "Summit Sites" });
    expect(email).toContain(`scored ${r.score} out of 100`);
    expect(email).toMatch(/- (Secure connection|Works on phones|Easy to contact)/);
    expect(email.trim().endsWith("Summit Sites")).toBe(true);
    expect(email).not.toMatch(/anypress/i);
  });
});
