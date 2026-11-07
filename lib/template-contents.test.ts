import { describe, expect, it } from "vitest";

import { parseTemplateContents, pluginName } from "./template-contents";

const built =
  'AnyPress store: WordPress, AnyPress Client, Fluent suite, Rank Math, WP Fusion Lite, AutomatorWP, FluentAuth, Ollie. {"builtAt":"2026-10-20T18:34:00Z","wordPress":"7.1.3","plugins":{"anypress-client":"2.3.2 (194505b)","fluent-cart":"1.9.0","seo-by-rank-math":"1.0.280","fluent-secur';

describe("template contents", () => {
  it("reads the plugins out of a cut-off build description", () => {
    const contents = parseTemplateContents(built);
    expect(contents.text).toBe("AnyPress store");
    expect(contents.wordPress).toBe("7.1.3");
    expect(contents.builtAt).toBe("2026-10-20T18:34:00Z");
    expect(contents.plugins).toEqual([
      { slug: "anypress-client", name: "AnyPress Client", version: "2.3.2" },
      { slug: "fluent-cart", name: "FluentCart", version: "1.9.0" },
      { slug: "seo-by-rank-math", name: "Rank Math SEO", version: "1.0.280" }
    ]);
  });

  it("lists plugins in AnyPress's order, others after them", () => {
    const contents = parseTemplateContents(
      '{"plugins":{"anypress-client":"2.12.0","my-plugin":"1.0","fluent-cart":"2.2.0","wp-fusion-lite":"3.48.0","fluent-crm":"3.3.1","fluent-player":"1.4.0","fluent-security":"3.1.0","anypress-blocks":"0.3.0"}}'
    );
    expect(contents.plugins.map((p) => p.slug)).toEqual([
      "anypress-client",
      "fluent-security",
      "fluent-crm",
      "fluent-cart",
      "fluent-player",
      "wp-fusion-lite",
      "anypress-blocks",
      "my-plugin"
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
