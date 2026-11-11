"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { LOOK_COOKIE, LOOKS, type Look } from "@/lib/looks";

function apply(look: Look) {
  if (look === "current") delete document.documentElement.dataset.look;
  else document.documentElement.dataset.look = look;
  document.cookie = `${LOOK_COOKIE}=${look}; path=/; max-age=31536000; samesite=lax`;
}

/** Sample data only: a bar at the bottom to switch between the style directions (lib/looks.ts). */
export function LookSwitcher({ initial }: { initial: Look }) {
  const [look, setLook] = React.useState<Look>(initial);

  return (
    <div
      role="group"
      aria-label="Style to preview"
      className="bg-foreground text-background fixed bottom-4 left-1/2 z-[60] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full p-1 text-xs font-semibold shadow-lg">
      <span className="px-2 max-sm:hidden">Style</span>
      {LOOKS.map((l) => (
        <button
          key={l.id}
          type="button"
          aria-pressed={look === l.id}
          onClick={() => {
            apply(l.id);
            setLook(l.id);
          }}
          className={cn(
            "rounded-full px-3 py-1.5 whitespace-nowrap transition-colors",
            look === l.id ? "bg-background text-foreground" : "hover:bg-background/15"
          )}>
          {l.label}
        </button>
      ))}
    </div>
  );
}
