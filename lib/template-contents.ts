/** What a template is built from, read out of its description. */
export interface TemplateContents {
  /** The description with the build details taken out; empty when nothing else was written. */
  text: string;
  wordPress?: string;
  builtAt?: string;
  plugins: { slug: string; name: string; version: string }[];
}

/** Display names for the plugins our templates ship; anything else is named from its slug. */
const pluginNames: Record<string, string> = {
  "waas-client": "WaaS Client",
  "fluent-cart": "FluentCart",
  "fluent-crm": "FluentCRM",
  fluentform: "Fluent Forms",
  "fluent-booking": "FluentBooking",
  "fluent-support": "Fluent Support",
  "fluent-affiliate": "FluentAffiliate",
  "easy-code-manager": "FluentSnippets",
  "seo-by-rank-math": "Rank Math SEO",
  "wp-fusion-lite": "WP Fusion Lite",
  automatorwp: "AutomatorWP",
  "fluent-security": "FluentAuth",
  "fluent-community": "FluentCommunity",
  "fluent-toolkit": "FluentHub",
  woocommerce: "WooCommerce"
};

/** Plugins that aren't on wordpress.org, so have no icon there. */
export const offDirectory = new Set(["waas-client", "fluent-toolkit"]);

export function pluginName(slug: string) {
  return pluginNames[slug] ?? slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/**
 * The build scripts append the template's waas-template.json ({builtAt, wordPress, plugins}) to its description,
 * which the API cuts at 500 characters, so the JSON is often unfinished: read what is complete.
 */
export function parseTemplateContents(comment: string | null | undefined): TemplateContents {
  const source = comment ?? "";
  const start = source.indexOf("{");
  const json = start >= 0 ? source.slice(start) : "";
  const pluginsAt = json.indexOf('"plugins":{');
  if (pluginsAt < 0) return { text: source.trim(), plugins: [] };

  const field = (name: string) => new RegExp(`"${name}":"([^"]+)"`).exec(json)?.[1];
  const plugins = [...json.slice(pluginsAt + 11).matchAll(/"([a-z0-9-]+)":"([^"]*)"/g)].map(([, slug, version]) => ({
    slug,
    name: pluginName(slug),
    version: version.split(" ")[0]
  }));
  // The prose before the JSON lists the same plugins, so only its label (before the colon) is kept.
  const text = source.slice(0, start).split(":")[0].trim().replace(/\.$/, "");
  return { text, wordPress: field("wordPress"), builtAt: field("builtAt"), plugins };
}
