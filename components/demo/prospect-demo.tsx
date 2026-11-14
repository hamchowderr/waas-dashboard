"use client";

import * as React from "react";
import { ArrowUpRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { BrandLink, type DemoLook } from "./demo-gallery";

/** Our own WordPress Playground (waas-provisioning-api/playground), in seamless mode: the website alone. */
const PLAYGROUND_SITE = "https://demo.anypress.site";

const noSubscribe = () => () => {};
const browserOrigin = () => window.location.origin;
const noOrigin = () => null;

/**
 * A demo website made for one business, in the seller's look around it: their site type's demo, with the business's
 * own name, colours, fonts, logo and offer, built in the visitor's browser from the blueprint at /demo/blueprint/<code>.
 */
export function ProspectDemo({ look, code, company, home }: { look: DemoLook; code: string; company: string; home: string }) {
  const origin = React.useSyncExternalStore(noSubscribe, browserOrigin, noOrigin);
  const [loaded, setLoaded] = React.useState(false);
  const src = origin
    ? `${PLAYGROUND_SITE}/?mode=seamless&blueprint-url=${encodeURIComponent(new URL(`/demo/blueprint/${code}`, origin).href)}`
    : null;

  return (
    <div className="bg-background text-foreground flex h-dvh flex-col">
      <header className="bg-card sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 px-3 shadow-[0_1px_0_rgb(27_25_23/0.06)] sm:h-16 sm:gap-3 sm:px-6">
        <BrandLink look={look} onHome={() => window.location.assign(home)} />
        <span className="bg-border hidden h-6 w-px sm:block" aria-hidden />
        <p className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
          <span className="max-sm:hidden">A website made for </span>
          <span className="text-foreground font-medium">{company}</span>
        </p>
        {look.shopUrl && (
          <Button size="sm" asChild>
            <a href={look.shopUrl} target="_top" rel="noopener">
              <span className="hidden sm:inline">Start your website</span>
              <span className="sm:hidden">Start</span>
              <ArrowUpRightIcon />
            </a>
          </Button>
        )}
      </header>
      <div className="relative flex-1">
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center" role="status" aria-live="polite">
            <Spinner className="size-6" />
            <p className="max-w-sm text-sm">Building {company}&apos;s website in your browser. It takes about a minute; nothing is installed.</p>
          </div>
        )}
        {src && (
          <iframe
            src={src}
            title={`A website made for ${company}`}
            className="absolute inset-0 size-full border-0"
            onLoad={() => setLoaded(true)}
            allow="clipboard-read; clipboard-write"
          />
        )}
      </div>
    </div>
  );
}
