"use client";

import * as React from "react";
import { CheckIcon, PrinterIcon } from "lucide-react";

import { useSellPrices } from "@/hooks/use-sell-prices";
import { PLAN_NAMES, type Pitch, type Plan } from "@/lib/sales-kit";
import { Button } from "@/components/ui/button";

type Props = {
  kind: "offer" | "deck";
  productId: string;
  group: string;
  plan: Plan;
  pitch: Pitch;
  brand: string;
  color: string | null;
  logo: string | null;
  support: string | null;
  shop: string | null;
  sender: string | null;
};

const STEPS = [
  ["Pick a design", "Choose a ready-made design for your business, or we pick one with you."],
  ["We add your content", "Your logo, photos, services and details, set up for you."],
  ["Go live", "Your site goes live on your own address, looked after every month."]
];

/** Printed pages stay light and use the seller's colour as the one accent. */
const PAGE = "bg-white text-neutral-900 [print-color-adjust:exact]";

export function PrintSheet(props: Props) {
  const prices = useSellPrices(props.productId)[0];
  const price = prices[props.plan];
  const accent = props.color ?? "#171717";
  const style = { "--brand": accent } as React.CSSProperties;

  return (
    <div style={style} className="min-h-screen bg-neutral-100 py-6 print:bg-white print:py-0">
      <style>{`@page { size: ${props.kind === "deck" ? "11in 6.1875in" : "letter"}; margin: 0; }`}</style>
      <div className="mx-auto mb-4 flex max-w-[8.5in] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <p className="text-sm text-neutral-600">Save as PDF from the print window. Prices come from your Sales Kit page.</p>
        <Button size="sm" onClick={() => window.print()}>
          <PrinterIcon data-icon="inline-start" />
          Print or save as PDF
        </Button>
      </div>
      {props.kind === "deck" ? <Deck {...props} price={price} /> : <Offer {...props} price={price} />}
    </div>
  );
}

function Brand({ brand, logo, light }: { brand: string; logo: string | null; light?: boolean }) {
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt={brand} className="h-9 w-auto max-w-[12rem] object-contain" />
  ) : (
    <span className={`text-lg font-bold tracking-tight ${light ? "text-white" : ""}`}>{brand}</span>
  );
}

function Contact({ sender, support, shop }: Pick<Props, "sender" | "support" | "shop">) {
  return (
    <div className="space-y-0.5 text-sm">
      {sender && <p className="font-medium">{sender}</p>}
      {support && <p>{support}</p>}
      {shop && <p>{shop}</p>}
    </div>
  );
}

function Offer({ brand, logo, group, plan, pitch, price, sender, support, shop }: Props & { price: number }) {
  return (
    <article className={`${PAGE} mx-auto flex min-h-[11in] w-full max-w-[8.5in] flex-col shadow-sm print:shadow-none`}>
      <header className="flex items-center justify-between px-12 pt-10">
        <Brand brand={brand} logo={logo} />
        <span className="text-xs tracking-wide text-neutral-500 uppercase">For {group.toLowerCase()}</span>
      </header>
      <section className="px-12 pt-12">
        <div className="mb-4 h-1 w-16 rounded-full bg-[var(--brand)]" />
        <h1 className="text-4xl leading-tight font-bold tracking-tight text-balance">{pitch.answer}</h1>
        <p className="mt-5 text-lg text-neutral-600">{pitch.pain.replace(/^./, (c) => c.toUpperCase())} It doesn&apos;t have to be that way.</p>
      </section>
      <section className="grid gap-4 px-12 pt-10 sm:grid-cols-3">
        {pitch.show.map((item) => (
          <div key={item} className="rounded-xl border border-neutral-200 p-4">
            <CheckIcon className="mb-2 size-5 text-[var(--brand)]" aria-hidden />
            <p className="text-sm leading-snug">{item}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-6 px-12 pt-10 sm:grid-cols-[1fr_14rem]">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">How it works</h2>
          <ol className="mt-3 space-y-3">
            {STEPS.map(([title, about], i) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-bold text-white">{i + 1}</span>
                <span className="text-sm">
                  <span className="font-semibold">{title}.</span> {about}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-xl bg-neutral-900 p-5 text-white">
          <p className="text-xs tracking-wide text-neutral-400 uppercase">{PLAN_NAMES[plan]}</p>
          <p className="mt-1 text-4xl font-bold">${price}</p>
          <p className="text-sm text-neutral-300">a month</p>
          <p className="mt-3 text-xs leading-relaxed text-neutral-300">Hosting, updates, backups, security and support included. No long contract.</p>
        </div>
      </section>
      <footer className="mt-auto flex items-end justify-between gap-6 border-t border-neutral-200 px-12 py-8">
        <div>
          <p className="text-lg font-semibold">Ready to see yours?</p>
          <p className="text-sm text-neutral-600">We&apos;ll set up a sample with your details, free.</p>
        </div>
        <Contact sender={sender} support={support} shop={shop} />
      </footer>
    </article>
  );
}

/** One 16:9 slide; on screen they stack, in print each is a page. */
function Slide({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <section
      className={`${dark ? "bg-neutral-900 text-white [print-color-adjust:exact]" : PAGE} mx-auto mb-6 flex aspect-[16/9] w-full max-w-[11in] flex-col justify-center px-[6%] py-[4%] shadow-sm break-after-page last:break-after-auto print:mb-0 print:h-[6.1875in] print:shadow-none`}
    >
      {children}
    </section>
  );
}

function Deck({ brand, logo, group, plan, pitch, price, sender, support, shop }: Props & { price: number }) {
  return (
    <div className="px-4 print:px-0">
      <Slide dark>
        <Brand brand={brand} logo={logo} light />
        <div className="mt-8 h-1 w-16 rounded-full bg-[var(--brand)]" />
        <h1 className="mt-4 text-[clamp(1.75rem,4.5vw,3.25rem)] leading-tight font-bold tracking-tight text-balance">Websites for {group.toLowerCase()}</h1>
        {sender && <p className="mt-4 text-neutral-300">{sender}</p>}
      </Slide>
      <Slide>
        <p className="text-sm font-semibold tracking-wide text-[var(--brand)] uppercase">The problem</p>
        <h2 className="mt-3 text-[clamp(1.5rem,3.5vw,2.5rem)] leading-tight font-bold text-balance">{pitch.pain.replace(/^./, (c) => c.toUpperCase())}</h2>
      </Slide>
      <Slide>
        <p className="text-sm font-semibold tracking-wide text-[var(--brand)] uppercase">Our answer</p>
        <h2 className="mt-3 text-[clamp(1.5rem,3.5vw,2.5rem)] leading-tight font-bold text-balance">{pitch.answer}</h2>
      </Slide>
      <Slide>
        <p className="text-sm font-semibold tracking-wide text-[var(--brand)] uppercase">What you get</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {pitch.show.map((item, i) => (
            <div key={item} className="rounded-xl border border-neutral-200 p-5">
              <p className="text-3xl font-bold text-[var(--brand)]">{i + 1}</p>
              <p className="mt-2 leading-snug">{item}</p>
            </div>
          ))}
        </div>
      </Slide>
      <Slide>
        <p className="text-sm font-semibold tracking-wide text-[var(--brand)] uppercase">How we start</p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map(([title, about], i) => (
            <li key={title} className="rounded-xl bg-neutral-100 p-5 [print-color-adjust:exact]">
              <p className="text-sm text-neutral-500">Step {i + 1}</p>
              <p className="mt-1 text-lg font-semibold">{title}</p>
              <p className="mt-1 text-sm text-neutral-600">{about}</p>
            </li>
          ))}
        </ol>
      </Slide>
      <Slide>
        <p className="text-sm font-semibold tracking-wide text-[var(--brand)] uppercase">What it costs</p>
        <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <p className="text-[clamp(2.5rem,7vw,5rem)] leading-none font-bold">${price}</p>
            <p className="mt-2 text-neutral-600">a month, {PLAN_NAMES[plan]}</p>
          </div>
          <ul className="space-y-1.5 text-sm">
            {["Hosting and security", "Updates and nightly backups", "Support from us", "No long contract"].map((x) => (
              <li key={x} className="flex items-center gap-2">
                <CheckIcon className="size-4 text-[var(--brand)]" aria-hidden />
                {x}
              </li>
            ))}
          </ul>
        </div>
      </Slide>
      <Slide dark>
        <h2 className="text-[clamp(1.75rem,4vw,3rem)] leading-tight font-bold">Let&apos;s set up a sample with your details.</h2>
        <div className="mt-8 text-neutral-200">
          <Contact sender={sender} support={support} shop={shop} />
        </div>
      </Slide>
    </div>
  );
}
