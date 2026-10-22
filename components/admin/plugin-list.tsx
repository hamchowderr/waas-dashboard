"use client";

import * as React from "react";

import { formatDate } from "@/lib/format";
import { offDirectory, type TemplateContents } from "@/lib/template-contents";

/** wordpress.org keeps each plugin's icon under one of these names; tried in order. */
const iconFiles = ["icon-128x128.png", "icon-128x128.gif", "icon.svg", "icon-128x128.jpg"];

function PluginIcon({ slug, name }: { slug: string; name: string }) {
  const [attempt, setAttempt] = React.useState(offDirectory.has(slug) ? iconFiles.length : 0);
  if (attempt >= iconFiles.length) {
    return (
      <span
        className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded text-xs font-semibold"
        aria-hidden={true}>
        {name.charAt(0)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://ps.w.org/${slug}/assets/${iconFiles[attempt]}`}
      alt=""
      loading="lazy"
      className="size-6 shrink-0 rounded"
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
