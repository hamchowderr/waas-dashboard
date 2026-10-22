"use client";

import * as React from "react";

import { formatDate } from "@/lib/format";
import { offDirectory, type TemplateContents } from "@/lib/template-contents";

/** wordpress.org keeps each plugin's icon under one of these names; tried in order. */
const iconFiles = ["icon-128x128.png", "icon-128x128.gif", "icon.svg", "icon-128x128.jpg"];

/**
 * A plugin's wordpress.org icon (the given one first, when known), or a letter tile for one that has none.
 * size-6 by default; pass a size class for another.
 */
export function PluginIcon({ slug, name, icon, className = "size-6" }: { slug: string; name: string; icon?: string | null; className?: string }) {
  const sources = React.useMemo(
    () => (offDirectory.has(slug) ? [] : [...(icon ? [icon] : []), ...iconFiles.map((file) => `https://ps.w.org/${slug}/assets/${file}`)]),
    [slug, icon]
  );
  const [attempt, setAttempt] = React.useState(0);
  if (attempt >= sources.length) {
    return (
      <span
        className={`bg-muted text-muted-foreground flex shrink-0 items-center justify-center rounded text-xs font-semibold ${className}`}
        aria-hidden={true}>
        {name.charAt(0)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
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
