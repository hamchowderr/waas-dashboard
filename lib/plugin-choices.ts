import { pluginName } from "@/lib/template-contents";

/**
 * The site types of the AnyPress template (its roles.json keys), as a plugin choice names them. "Everything"
 * also covers stores bought before site types, whose key is "store".
 */
export const SITE_TYPES: { label: string; keys: string[] }[] = [
  { label: "Website", keys: ["website"] },
  { label: "Bookings", keys: ["bookings"] },
  { label: "Online store", keys: ["online-store"] },
  { label: "Community & courses", keys: ["community"] },
  { label: "Everything", keys: ["everything", "store"] }
];

/** "All site types", or the labels of the ones a choice lists. */
export function siteTypesLabel(keys: string[]) {
  if (!keys.length) return "All site types";
  const labels = SITE_TYPES.filter((t) => t.keys.some((k) => keys.includes(k))).map((t) => t.label);
  const other = keys.filter((k) => !SITE_TYPES.some((t) => t.keys.includes(k)));
  return [...labels, ...other].join(", ");
}

/** The AnyPress template's plugins a storefront can switch off (WaaS Client runs the store, so it stays). */
export const TEMPLATE_PLUGINS = [
  "fluent-cart",
  "fluent-crm",
  "fluentform",
  "fluent-booking",
  "fluent-support",
  "fluent-affiliate",
  "fluent-community",
  "easy-code-manager",
  "seo-by-rank-math",
  "wp-fusion-lite",
  "automatorwp",
  "fluent-security",
  "fluent-toolkit"
].map((slug) => ({ slug, name: pluginName(slug) }));

/** 1234567 -> "1M+", as wordpress.org rounds active installs. */
export function installsLabel(n: number) {
  if (n >= 1_000_000) return `${Math.floor(n / 1_000_000)}M+`;
  if (n >= 1_000) return `${Math.floor(n / 1_000)}K+`;
  return n > 0 ? `${n}+` : "Fewer than 10";
}

/** The largest premium plugin zip the API takes. */
export const MAX_PLUGIN_ZIP = 64 * 1024 * 1024;
