"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon, DownloadIcon, ExternalLinkIcon, FileTextIcon, MailIcon, MapPinIcon, MegaphoneIcon, MessageSquareIcon, PhoneIcon, PresentationIcon, Share2Icon, type LucideIcon } from "lucide-react";

import { useSellPrices } from "@/hooks/use-sell-prices";
import { PLAN_NAMES, fill, keep, playbookMarkdown, type KitDemo, type KitContext, type Pitch, type Playbook, type Step } from "@/lib/sales-kit";
import { Inline, KitMarkdown } from "@/components/admin/kit-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "cn";
import { CopyButton, download, slug } from "../kit-ui";
import { OutreachAutomation } from "./outreach-automation";

const CHANNEL: Record<Step["channel"], { icon: LucideIcon; label: string }> = {
  post: { icon: MegaphoneIcon, label: "Post" },
  social: { icon: Share2Icon, label: "Direct message" },
  email: { icon: MailIcon, label: "Email" },
  text: { icon: MessageSquareIcon, label: "Text" },
  call: { icon: PhoneIcon, label: "Call" }
};

const dayLabel = (day: number) => (day === 0 ? "Before you start" : `Day ${day}`);

export function Campaign({
  productId,
  playbook,
  steps,
  pitch,
  who,
  where,
  objections,
  demo,
  demos,
  callScript,
  context
}: {
  productId: string;
  playbook: Playbook;
  steps: Step[];
  pitch: Pitch;
  who: string;
  where: string;
  objections: string;
  demo: string;
  demos: KitDemo[];
  callScript: string;
  context: Omit<KitContext, "prices" | "plan">;
}) {
  const [prices] = useSellPrices(productId);
  const ctx: KitContext = { ...context, prices, plan: playbook.plan };
  const price = prices[playbook.plan];
  const days = [...new Set(steps.map((s) => s.day))];
  const print = (kind: "offer" | "deck") => `/print/sell?product=${encodeURIComponent(productId)}&group=${playbook.id}&kind=${kind}`;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="space-y-4 lg:space-y-6">
        <Card>
          <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs font-medium">What you sell them</p>
              <p className="mt-0.5 text-lg font-semibold">
                {PLAN_NAMES[playbook.plan]} at ${price} a month
              </p>
              <p className="text-muted-foreground text-sm">You keep ${keep(playbook.plan, price)} a month on every site. Change prices on the Sales Kit page.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={print("offer")} target="_blank" rel="noreferrer">
                  <FileTextIcon data-icon="inline-start" />
                  Offer sheet
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={print("deck")} target="_blank" rel="noreferrer">
                  <PresentationIcon data-icon="inline-start" />
                  Pitch deck
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={() => download(`${slug(context.brand)}-${playbook.id}-playbook.md`, playbookMarkdown(playbook, ctx))}>
                <DownloadIcon data-icon="inline-start" />
                Playbook
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your plan, day by day</CardTitle>
            <CardDescription>Send each message on its day, and stop when they reply. Dashed boxes are yours to fill in for each prospect.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="relative">
              {days.map((day, i) => (
                <li key={day} className="relative grid grid-cols-[1.75rem_1fr] gap-x-3 pb-6 last:pb-0">
                  {i < days.length - 1 && <span className="bg-border absolute top-7 bottom-0 left-[0.8125rem] w-px" aria-hidden />}
                  <span className="bg-card text-muted-foreground relative z-10 flex size-7 items-center justify-center rounded-full border text-xs font-semibold tabular-nums">
                    {day === 0 ? <CheckIcon className="size-3.5" aria-hidden /> : day}
                  </span>
                  <div className="min-w-0 space-y-2">
                    <p className="pt-1 text-sm font-semibold">{dayLabel(day)}</p>
                    {steps
                      .filter((s) => s.day === day)
                      .map((s) => (
                        <StepCard key={`${s.channel}-${s.title}`} step={s} ctx={ctx} callScript={callScript} defaultOpen={i === 0 || (i === 1 && day === 1)} />
                      ))}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <OutreachAutomation productId={productId} group={playbook.title} steps={steps} ctx={ctx} />
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20">
        <Card>
          <CardHeader>
            <CardTitle>The pitch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-base leading-snug font-medium">“{pitch.answer}”</p>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium">Their problem</p>
              <p>{pitch.pain.replace(/^./, (c) => c.toUpperCase())}</p>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium">Show them</p>
              <ul className="space-y-2">
                {pitch.show.map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckIcon className="text-foreground/70 mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Where to find them</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <KitMarkdown source={where} ctx={ctx} />
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium">Search Google Maps for</p>
              <div className="flex flex-wrap gap-1.5">
                {playbook.finder.map((f) => (
                  <a key={f} href={`https://www.google.com/maps/search/${encodeURIComponent(f)}`} target="_blank" rel="noreferrer">
                    <Badge variant="outline" className="hover:bg-muted gap-1">
                      <MapPinIcon className="size-3" aria-hidden />
                      {f}
                    </Badge>
                  </a>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>When they push back</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {objectionList(objections).map((o) => (
              <Collapsible key={o.q} className="group/obj py-2 first:pt-0 last:pb-0">
                <CollapsibleTrigger className="flex w-full items-start justify-between gap-2 text-left text-sm font-medium">
                  <Inline text={o.q} ctx={ctx} />
                  <ChevronDownIcon className="text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform group-data-[state=open]/obj:rotate-180" aria-hidden />
                </CollapsibleTrigger>
                <CollapsibleContent className="text-muted-foreground pt-1.5 text-sm">
                  <Inline text={o.a} ctx={ctx} />
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Who they are</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <KitMarkdown source={who} ctx={ctx} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live demo</CardTitle>
            <CardDescription>
              <Inline text={demo} ctx={ctx} />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {demos.length ? (
              demos.map((d) => (
                <a
                  key={d.kit}
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:bg-muted/60 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{d.business}</span>
                    <span className="text-muted-foreground block text-xs">{d.kind} · opens in about 30 seconds</span>
                  </span>
                  <ExternalLinkIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
                </a>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">A demo built for this group is on the way.</p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

/** "- **"Question?"** Answer." lines from a playbook's Objections. */
function objectionList(source: string) {
  return [...source.matchAll(/^-\s+\*\*(.+?)\*\*\s*(.+)$/gm)].map((m) => ({ q: m[1]!.replace(/^"|"$/g, ""), a: m[2]!.trim() }));
}

function StepCard({ step, ctx, callScript, defaultOpen }: { step: Step; ctx: KitContext; callScript: string; defaultOpen: boolean }) {
  const { icon: Icon, label } = CHANNEL[step.channel];
  const m = step.message;
  const copy = m ? fill(m.subject ? `Subject: ${m.subject}\n\n${m.body}` : m.body, ctx) : null;
  return (
    <Collapsible defaultOpen={defaultOpen} className="group/step rounded-lg border">
      <div className="flex items-center gap-2 px-3 py-2">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
          <span className="text-muted-foreground shrink-0 text-xs max-sm:hidden">{label}</span>
          <span className="line-clamp-2 text-sm font-medium">{m?.subject ? <Inline text={m.subject} ctx={ctx} /> : step.title}</span>
          <ChevronDownIcon className="text-muted-foreground ml-auto size-4 shrink-0 transition-transform group-data-[state=open]/step:rotate-180" aria-hidden />
        </CollapsibleTrigger>
        {copy && <CopyButton text={copy} label={`${label}: ${step.title}`} variant="ghost" />}
      </div>
      <CollapsibleContent className={cn("border-t px-3 py-3 text-sm")}>
        {m ? (
          <p className="whitespace-pre-line">
            <Inline text={m.body} ctx={ctx} />
          </p>
        ) : (
          <CallOutline script={callScript} ctx={ctx} />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

/** The call script's steps, short, for the call step. */
function CallOutline({ script, ctx }: { script: string; ctx: KitContext }) {
  const parts = [...script.matchAll(/^## (\d\..+)$/gm)].map((m) => m[1]!);
  return (
    <div className="space-y-2">
      <p>If they haven&apos;t replied, call to book a 15-minute demo. The full script is under Guides.</p>
      <ol className="text-muted-foreground list-inside list-decimal space-y-0.5">
        {parts.map((p) => (
          <li key={p}>
            <Inline text={p.replace(/^\d\.\s*/, "")} ctx={ctx} />
          </li>
        ))}
      </ol>
      <p className="text-muted-foreground">
        Suggest {PLAN_NAMES[ctx.plan!]} at ${ctx.prices[ctx.plan!]} a month.
      </p>
    </div>
  );
}
