import { describe, expect, it } from "vitest";

import { parseTemplateContents, pluginName } from "./template-contents";

const built =
  'AnyPress store: WordPress, WaaS Client, Fluent suite, Rank Math, WP Fusion Lite, AutomatorWP, FluentAuth, Ollie. {"builtAt":"2026-10-20T18:34:00Z","wordPress":"7.1.3","plugins":{"waas-client":"2.3.2 (194505b)","fluent-cart":"1.9.0","seo-by-rank-math":"1.0.280","fluent-secur';

describe("template contents", () => {
  it("reads the plugins out of a cut-off build description", () => {
    const contents = parseTemplateContents(built);
    expect(contents.text).toBe("AnyPress store");
    expect(contents.wordPress).toBe("7.1.3");
    expect(contents.builtAt).toBe("2026-10-20T18:34:00Z");
    expect(contents.plugins).toEqual([
      { slug: "waas-client", name: "WaaS Client", version: "2.3.2" },
      { slug: "fluent-cart", name: "FluentCart", version: "1.9.0" },
      { slug: "seo-by-rank-math", name: "Rank Math SEO", version: "1.0.280" }
    ]);
  });

  it("keeps a short label in front of the build details", () => {
    expect(parseTemplateContents('AnyPress store (Ollie). {"plugins":{"fluent-crm":"3.2.6"}}').text).toBe("AnyPress store (Ollie)");
  });

  it("leaves a plain description as it is", () => {
    expect(parseTemplateContents("Our starter shop")).toEqual({ text: "Our starter shop", plugins: [] });
    expect(parseTemplateContents(null)).toEqual({ text: "", plugins: [] });
  });

  it("names unknown plugins from their slug", () => {
    expect(pluginName("my-custom-plugin")).toBe("My Custom Plugin");
  });
});
