"use client";

import * as React from "react";

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

/** A template's plugins as icons with their names, and the WordPress version it was built on. */
export function PluginList({ contents }: { contents: TemplateContents }) {
  if (!contents.plugins.length) return null;
  return (
    <div className="mt-2 space-y-2">
      <ul className="flex flex-wrap gap-2">
        {contents.plugins.map((plugin) => (
          <li key={plugin.slug} className="flex items-center gap-2 rounded-md border py-1 ps-1 pe-2.5 text-sm">
            <PluginIcon slug={plugin.slug} name={plugin.name} />
            <span>{plugin.name}</span>
            <span className="text-muted-foreground text-xs tabular-nums">{plugin.version}</span>
          </li>
        ))}
      </ul>
      {(contents.wordPress || contents.builtAt) && (
        <p className="text-muted-foreground text-xs">
          {[contents.wordPress && `WordPress ${contents.wordPress}`, contents.builtAt && `built ${formatDate(contents.builtAt)}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
