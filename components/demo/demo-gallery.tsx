"use client";

import * as React from "react";
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon, MousePointerClickIcon, PencilRulerIcon, XIcon } from "lucide-react";

import { DEMOS, findDemo, playgroundUrl, type Demo } from "@/lib/demos";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type DemoLook = {
  /** The name in the top bar. */
  name: string;
  /** A logo image, else `mark` or a plain tile with the name's first letter. */
  logoUrl: string | null;
  /** The platform's own mark, on its own demo page only. */
  mark?: React.ReactNode;
  /** Where "Start your website" goes; null leaves it out. */
  shopUrl: string | null;
};

const PLAYGROUND = "https://wordpress.org/playground/";

/** The ?d= in the address: which demo is open. Kept in the address so a demo can be shared as a link. */
function useOpenDemo(initial: string | null) {
  const [id, setId] = React.useState(initial);
  React.useEffect(() => {
    const back = () => setId(new URLSearchParams(window.location.search).get("d"));
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);
  const open = React.useCallback((next: string | null) => {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("d", next);
    else url.searchParams.delete("d");
    window.history.pushState(null, "", url);
    setId(next);
    window.scrollTo({ top: 0 });
  }, []);
  return [findDemo(id), open] as const;
}

/**
 * The demo page: a gallery of demo websites, and the one picked, built on WordPress Playground in the visitor's
 * browser. Everything around the website carries `look`; the website itself is the business's demo.
 */
export function DemoGallery({ look, initialDemo }: { look: DemoLook; initialDemo: string | null }) {
  const [demo, open] = useOpenDemo(initialDemo);

  return (
    <div className={`bg-background text-foreground flex flex-col ${demo ? "h-dvh" : "min-h-dvh"}`}>
      <header className="bg-card sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 px-3 shadow-[0_1px_0_rgb(27_25_23/0.06)] sm:h-16 sm:gap-3 sm:px-6">
        <BrandLink look={look} onHome={() => open(null)} />
        {demo && (
          <>
            <span className="bg-border hidden h-6 w-px sm:block" aria-hidden />
            <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={() => open(null)}>
              <ArrowLeftIcon />
              All demos
            </Button>
            <Select value={demo.id} onValueChange={(v) => open(v)}>
              <SelectTrigger size="sm" className="min-w-0 max-w-[46vw] rounded-full sm:max-w-72" aria-label="Pick a demo website">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEMOS.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.business}
                    <span className="text-muted-foreground ms-1 hidden sm:inline">· {d.kind}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        <div className="ms-auto flex items-center gap-2">
          {look.shopUrl && (
            <Button asChild size="lg" className="h-9 px-3.5 sm:px-5">
              <a href={look.shopUrl} target="_top" rel="noopener">
                <span className="sm:hidden">Start</span>
                <span className="hidden sm:inline">Start your website</span>
                <ArrowRightIcon />
              </a>
            </Button>
          )}
        </div>
      </header>

      {demo ? <DemoFrame key={demo.id} demo={demo} /> : <Gallery onOpen={open} />}
    </div>
  );
}

function BrandLink({ look, onHome }: { look: DemoLook; onHome: () => void }) {
  // A square logo is a mark, so the name goes beside it; a wide one usually spells the name already.
  const [square, setSquare] = React.useState(false);
  const logo = React.useRef<HTMLImageElement>(null);
  const measure = React.useCallback(() => {
    const img = logo.current;
    if (img?.complete && img.naturalWidth) setSquare(img.naturalWidth < img.naturalHeight * 1.6);
  }, []);
  // A cached logo can finish loading before the page is interactive, so look once on mount too.
  React.useEffect(measure, [measure, look.logoUrl]);
  return (
    <button type="button" onClick={onHome} className="flex min-w-0 shrink-0 items-center gap-2 rounded-full pe-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      {look.logoUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={logo}
            src={look.logoUrl}
            alt={square ? "" : look.name}
            className="h-8 max-w-32 object-contain sm:max-w-40"
            onLoad={measure}
          />
          {square && <span className="hidden truncate text-[15px] font-extrabold tracking-tight min-[420px]:inline sm:max-w-56">{look.name}</span>}
        </>
      ) : (
        <>
          {look.mark ?? (
            <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold">
              {look.name.trim().charAt(0).toUpperCase()}
            </span>
          )}
          <span className="hidden truncate text-[15px] font-extrabold tracking-tight min-[420px]:inline sm:max-w-56">{look.name}</span>
        </>
      )}
    </button>
  );
}

function Gallery({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="max-w-2xl">
        <p className="text-primary text-sm font-semibold">Live demo websites</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-[2.6rem] sm:leading-[1.1]">
          See a real website for a business like yours
        </h1>
        <p className="text-muted-foreground mt-4 text-base text-pretty sm:text-lg">
          Each demo is a complete website that runs right here in your browser. Click every page, send the forms, then open
          the editor and change the words, colours or photos. Nothing you do is saved, so try anything.
        </p>
      </div>

      <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <li className="flex items-center gap-2">
          <MousePointerClickIcon className="text-primary size-4" /> Real pages, menus and forms
        </li>
        <li className="flex items-center gap-2">
          <PencilRulerIcon className="text-primary size-4" /> Edit anything, like the owner would
        </li>
      </ul>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {DEMOS.map((demo) => (
          <DemoCard key={demo.id} demo={demo} onOpen={() => onOpen(demo.id)} />
        ))}
      </div>

      <p className="text-muted-foreground mt-10 text-xs">
        Demos run on{" "}
        <a href={PLAYGROUND} target="_blank" rel="noopener" className="hover:text-foreground underline underline-offset-2">
          WordPress Playground
        </a>
        , free software from the WordPress project (GPL).
      </p>
    </main>
  );
}

function DemoCard({ demo, onOpen }: { demo: Demo; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group bg-card shadow-card focus-visible:ring-ring/50 flex flex-col overflow-hidden rounded-[22px] text-start transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-3">
      <div className="bg-muted aspect-[16/10] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={demo.photo} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {demo.city ? `${demo.kind} · ${demo.city}` : demo.kind}
        </span>
        <span className="text-lg leading-tight font-extrabold tracking-tight">{demo.business}</span>
        <span className="text-muted-foreground text-sm">{demo.about}</span>
        <span className="text-primary mt-auto flex items-center gap-1 pt-3 text-sm font-semibold">
          Open the demo
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}

function DemoFrame({ demo }: { demo: Demo }) {
  const [tip, setTip] = React.useState(true);
  return (
    <main className="relative flex min-h-0 flex-1 flex-col">
      {tip && (
        <div className="bg-muted text-muted-foreground flex items-start gap-3 px-3 py-2 text-xs sm:items-center sm:px-6 sm:text-[13px]" role="status">
          <p className="flex-1">
            <span className="text-foreground font-semibold">{demo.business}</span> is being built in your browser; the first time takes about a minute.
            <span className="hidden sm:inline"> You&apos;re signed in as the owner, so try <b className="text-foreground">Edit Site</b> at the top.</span>{" "}
            Not loading?{" "}
            <a href={playgroundUrl(demo)} target="_blank" rel="noopener" className="hover:text-foreground underline underline-offset-2">
              Open it in a new tab
            </a>
            . Runs on{" "}
            <a href={PLAYGROUND} target="_blank" rel="noopener" className="hover:text-foreground inline-flex items-center underline underline-offset-2">
              WordPress Playground
              <ArrowUpRightIcon className="size-3" />
            </a>
          </p>
          <button type="button" onClick={() => setTip(false)} aria-label="Hide this note" className="hover:text-foreground -m-1 rounded-full p-1">
            <XIcon className="size-4" />
          </button>
        </div>
      )}
      <iframe
        title={`${demo.business}: demo website`}
        src={playgroundUrl(demo)}
        className="w-full flex-1 border-0 bg-white"
        allow="clipboard-read; clipboard-write"
      />
    </main>
  );
}
