"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { formatDate } from "@/lib/format";
import { offDirectory, type TemplateContents } from "@/lib/template-contents";

/** wordpress.org keeps each plugin's icon under one of these names; tried in order. */
const iconFiles = ["icon.svg", "icon-128x128.png", "icon-128x128.gif", "icon-128x128.jpg"];

/**
 * The template's own plugins carry their logo with the dashboard (public/plugins), so they never wait on
 * wordpress.org or show a broken picture; other plugins load theirs from wordpress.org.
 */
const localIcons: Record<string, string> = {
  "fluent-security": "svg",
  "fluent-smtp": "svg",
  "fluent-crm": "svg",
  fluentform: "png",
  "fluent-booking": "svg",
  "fluent-cart": "svg",
  "fluent-community": "svg",
  "fluent-player": "svg",
  "fluent-affiliate": "svg",
  "fluent-support": "svg",
  "easy-code-manager": "svg",
  "seo-by-rank-math": "svg",
  automatorwp: "png",
  "wp-fusion-lite": "png",
  leadconnector: "png",
  woocommerce: "svg",
  "contact-form-7": "svg"
};

/** Our own plugins, which aren't on wordpress.org, show the dashboard's own mark. */
const ownPlugin = (slug: string) => slug.startsWith("anypress-") || slug.startsWith("waas-");

/**
 * The picture our own plugins get: the AnyPress mark, or on a branded dashboard the brand's icon or logo
 * (null: its letter), since those stores show AnyPress Client in the seller's brand.
 */
const OwnPluginMark = React.createContext<string | null>("/anypress-mark.svg");

export function OwnPluginMarkProvider({ mark, children }: { mark: string | null; children: React.ReactNode }) {
  return <OwnPluginMark.Provider value={mark}>{children}</OwnPluginMark.Provider>;
}

/**
 * A plugin's wordpress.org icon (the given one first, when known), or a letter tile for one that has none.
 * size-6 by default; pass a size class for another.
 */
export function PluginIcon({ slug, name, icon, className = "size-6" }: { slug: string; name: string; icon?: string | null; className?: string }) {
  const ownMark = React.useContext(OwnPluginMark);
  const sources = React.useMemo(
    () =>
      ownPlugin(slug)
        ? ownMark
          ? [ownMark]
          : []
        : localIcons[slug]
          ? [`/plugins/${slug}.${localIcons[slug]}`]
          : offDirectory.has(slug)
            ? []
            : [...(icon ? [icon] : []), ...iconFiles.map((file) => `https://ps.w.org/${slug}/assets/${file}`)],
    [slug, icon, ownMark]
  );
  const [attempt, setAttempt] = React.useState(0);
  // A picture that failed before the page came alive never fired onError: check once it is on screen.
  const img = React.useRef<HTMLImageElement>(null);
  React.useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setAttempt((a) => a + 1);
  }, [attempt]);
  if (attempt >= sources.length) {
    return (
      <span
        className={`bg-muted text-foreground/70 ring-border flex shrink-0 items-center justify-center rounded-lg text-[0.8125rem] font-semibold ring-1 ring-inset ${className}`}
        aria-hidden={true}>
        {name.charAt(0)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={img}
      key={sources[attempt]}
      src={sources[attempt]}
      alt=""
      loading="lazy"
      className={`shrink-0 rounded ${className}`}
      onError={() => setAttempt((a) => a + 1)}
    />
  );
}

/**
 * A template's build in one line (WordPress version, how many plugins, when it was built), with its plugins listed
 * when opened: the full list is a reference, not something to read on every row.
 */
export function PluginList({ contents }: { contents: TemplateContents }) {
  if (!contents.plugins.length) return null;
  const count = `${contents.plugins.length} ${contents.plugins.length === 1 ? "plugin" : "plugins"}`;
  const summary = [contents.wordPress && `WordPress ${contents.wordPress}`, count, contents.builtAt && `built ${formatDate(contents.builtAt)}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <details className="group mt-1.5 text-sm">
      <summary className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer list-none items-center gap-1 text-xs select-none pointer-coarse:min-h-11">
        {summary}
        <ChevronDownIcon className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
        <span className="sr-only">, show the plugins</span>
      </summary>
      <ul className="mt-2 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {contents.plugins.map((plugin) => (
          <li key={plugin.slug} className="flex min-w-0 items-center gap-2">
            <PluginIcon slug={plugin.slug} name={plugin.name} className="size-5" />
            <span className="truncate">{plugin.name}</span>
            <span className="text-muted-foreground ms-auto text-xs tabular-nums">{plugin.version}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
