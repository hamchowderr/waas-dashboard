"use client";

import * as React from "react";
import { SparklesIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AiApp } from "@/lib/integrations";
import { CopyButton } from "../sell/kit-ui";

/**
 * Ready-made prompts for each AI app: pick the app, copy a prompt, paste it in. Chat apps get prompts for running
 * sites; code editors get prompts for building on the API as well. Words in [brackets] are filled in before sending.
 */
export function AiPrompts({ apps }: { apps: AiApp[] }) {
  const [current, setCurrent] = React.useState(apps[0].id);
  const app = apps.find((a) => a.id === current) ?? apps[0];

  return (
    <div className="space-y-4" data-testid="ai-prompts">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Prompts to copy</h3>
        <p className="text-muted-foreground text-sm">
          Pick your app, copy a prompt and paste it in. Replace the words in [brackets] with your own.
        </p>
      </div>
      <div role="tablist" aria-label="AI app" className="flex flex-wrap gap-2">
        {apps.map((a) => {
          const on = a.id === app.id;
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              id={`ai-tab-${a.id}`}
              aria-selected={on}
              aria-controls="ai-prompts-panel"
              onClick={() => setCurrent(a.id)}
              className={cn(
                "focus-visible:ring-ring/50 inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px]",
                on ? "border-foreground bg-foreground text-background" : "hover:bg-muted text-foreground"
              )}>
              {a.logo ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-white p-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.logo} alt="" className="size-full object-contain" />
                </span>
              ) : (
                <SparklesIcon className="size-4" aria-hidden />
              )}
              {a.name}
            </button>
          );
        })}
      </div>
      <div id="ai-prompts-panel" role="tabpanel" aria-labelledby={`ai-tab-${app.id}`} className="space-y-3">
        <p className="text-muted-foreground text-sm text-pretty">
          <span className="text-foreground font-medium">Add it to {app.name}: </span>
          {app.connect}
        </p>
        <ul className="grid gap-3 lg:grid-cols-2">
          {app.prompts.map((p) => (
            <li key={p.title} className="bg-muted/50 flex min-w-0 flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 text-sm font-semibold">{p.title}</p>
                <CopyButton text={p.text} label={`the ${p.title} prompt`} />
              </div>
              <p className="text-muted-foreground line-clamp-4 text-sm whitespace-pre-line" title={p.text}>
                {p.text}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
