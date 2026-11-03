"use client";

import * as React from "react";
import {
  Building2Icon,
  CheckIcon,
  ChurchIcon,
  CodeXmlIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  GraduationCapIcon,
  LandmarkIcon,
  MegaphoneIcon,
  PresentationIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  type LucideIcon
} from "lucide-react";
import { toast } from "sonner";

import {
  LIST_COST,
  PLANS,
  PLAN_NAMES,
  fill,
  messages,
  playbookMarkdown,
  type GroupId,
  type Guide,
  type KitContext,
  type Message,
  type Plan,
  type Playbook
} from "@/lib/sales-kit";
import { Inline, KitMarkdown } from "@/components/admin/kit-markdown";
import { useSellPrices } from "@/hooks/use-sell-prices";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "cn";

const ICONS: Record<GroupId, LucideIcon> = {
  shops: ShoppingBagIcon,
  regulated: ShieldCheckIcon,
  courses: GraduationCapIcon,
  chambers: LandmarkIcon,
  churches: ChurchIcon,
  franchises: Building2Icon,
  agencies: MegaphoneIcon,
  developers: CodeXmlIcon
};

/** The playbook's parts as tabs; the pitch and the offer read best together. */
const TABS: { id: string; label: string; parts: string[] }[] = [
  { id: "who", label: "Who", parts: ["Who"] },
  { id: "find", label: "Find", parts: ["Where to find them"] },
  { id: "pitch", label: "Pitch", parts: ["What to lead with", "Offer"] },
  { id: "messages", label: "Messages", parts: ["Outreach"] },
  { id: "objections", label: "Objections", parts: ["Objections"] },
  { id: "demo", label: "Demo", parts: ["Demo"] }
];

type Context = Omit<KitContext, "prices" | "plan">;

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function SalesKit({
  productId,
  playbooks,
  guides,
  initialGroup,
  context
}: {
  productId: string;
  playbooks: Playbook[];
  guides: Guide[];
  initialGroup?: string;
  context: Context;
}) {
  const [prices, setPrice] = useSellPrices(productId);
  const [groupId, setGroupId] = React.useState<GroupId>((playbooks.find((p) => p.id === initialGroup) ?? playbooks[0]!).id);
  const playbook = playbooks.find((p) => p.id === groupId)!;
  const ctx: KitContext = { ...context, prices, plan: playbook.plan };

  const pick = (id: GroupId) => {
    setGroupId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("group", id);
    window.history.replaceState(null, "", url);
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3" role="radiogroup" aria-label="Customer group">
        {playbooks.map((p) => {
          const Icon = ICONS[p.id];
          const on = p.id === groupId;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => pick(p.id)}
              className={cn(
                "bg-card hover:bg-muted/50 flex h-full flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors",
                on && "border-foreground ring-foreground/10 ring-2"
              )}
            >
              <Icon className="text-muted-foreground size-5" aria-hidden />
              <span className="text-sm leading-snug font-medium">{p.title}</span>
              <span className="text-muted-foreground mt-auto text-xs">
                {PLAN_NAMES[p.plan]} · ${prices[p.plan]}/mo
              </span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>{playbook.title}</CardTitle>
            <CardDescription>
              Lead with {PLAN_NAMES[playbook.plan]} at ${prices[playbook.plan]} a month. Grey boxes are yours to fill in for each prospect.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["offer", "deck"] as const).map((kind) => (
              <Button key={kind} variant="outline" size="sm" asChild>
                <a href={`/print/sell?product=${encodeURIComponent(productId)}&group=${playbook.id}&kind=${kind}`} target="_blank" rel="noreferrer">
                  {kind === "offer" ? <FileTextIcon data-icon="inline-start" /> : <PresentationIcon data-icon="inline-start" />}
                  {kind === "offer" ? "Offer sheet" : "Pitch deck"}
                </a>
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => download(`${slug(context.brand)}-${playbook.id}-playbook.md`, playbookMarkdown(playbook, ctx))}>
              <DownloadIcon data-icon="inline-start" />
              Playbook
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs key={playbook.id} defaultValue="who">
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <TabsList>
                {TABS.map((t) => (
                  <TabsTrigger key={t.id} value={t.id}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {TABS.map((t) => (
              <TabsContent key={t.id} value={t.id} className="pt-2">
                {t.id === "messages" ? (
                  <Messages list={messages(playbook.sections.find((s) => s.title === "Outreach")?.body ?? "")} ctx={ctx} />
                ) : t.id === "find" ? (
                  <Find playbook={playbook} ctx={ctx} />
                ) : (
                  <div className="space-y-5">
                    {t.parts.map((part) => {
                      const section = playbook.sections.find((s) => s.title === part);
                      return section ? (
                        <section key={part} className="space-y-2">
                          {t.parts.length > 1 && <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{part}</h2>}
                          <KitMarkdown source={section.body} ctx={ctx} />
                        </section>
                      ) : null;
                    })}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <Prices prices={prices} setPrice={setPrice} />
        <Guides guides={guides} ctx={ctx} brand={context.brand} />
      </div>
    </div>
  );
}

function Find({ playbook, ctx }: { playbook: Playbook; ctx: KitContext }) {
  const section = playbook.sections.find((s) => s.title === "Where to find them");
  return (
    <div className="space-y-4">
      {section && <KitMarkdown source={section.body} ctx={ctx} />}
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Search Google Maps for</p>
        <div className="flex flex-wrap gap-1.5">
          {playbook.finder.map((f) => (
            <a key={f} href={`https://www.google.com/maps/search/${encodeURIComponent(f)}`} target="_blank" rel="noreferrer">
              <Badge variant="outline" className="hover:bg-muted">
                {f}
              </Badge>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = React.useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Couldn't copy. Select the text and copy it instead.");
        }
      }}
    >
      {done ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
      {done ? "Copied" : "Copy"}
    </Button>
  );
}

const KIND_LABEL: Record<Message["kind"], string> = { email: "Emails", text: "Texts", social: "Social and direct messages" };

function Messages({ list, ctx }: { list: Message[]; ctx: KitContext }) {
  return (
    <div className="space-y-6">
      {(["email", "text", "social"] as const).map((kind) => {
        const of = list.filter((m) => m.kind === kind);
        if (!of.length) return null;
        return (
          <section key={kind} className="space-y-3">
            <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{KIND_LABEL[kind]}</h2>
            <div className={cn("grid gap-3", kind === "email" ? "md:grid-cols-2" : "md:grid-cols-3")}>
              {of.map((m) => {
                const copy = fill(m.subject ? `Subject: ${m.subject}\n\n${m.body}` : m.body, ctx);
                return (
                  <div key={m.title} className="flex flex-col rounded-lg border">
                    <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
                      <span className="text-sm font-medium">{m.title}</span>
                      <CopyButton text={copy} label={m.title} />
                    </div>
                    <div className="space-y-2 p-3 text-sm">
                      {m.subject && (
                        <p>
                          <span className="text-muted-foreground">Subject: </span>
                          <Inline text={m.subject} ctx={ctx} />
                        </p>
                      )}
                      <p className="whitespace-pre-line">
                        <Inline text={m.body} ctx={ctx} />
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Prices({ prices, setPrice }: { prices: Record<Plan, number>; setPrice: (plan: Plan, value: number) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your prices</CardTitle>
        <CardDescription>What you charge a month. The playbooks and messages use these. Your cost is the list price per site, before volume discounts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {PLANS.map((plan) => (
          <div key={plan} className="grid grid-cols-[1fr_6rem] items-center gap-3">
            <div className="min-w-0">
              <Label htmlFor={`price-${plan}`}>{PLAN_NAMES[plan]}</Label>
              <p className="text-muted-foreground text-xs">
                Cost ${LIST_COST[plan]} · you keep ${Math.max(0, prices[plan] - LIST_COST[plan])}
              </p>
            </div>
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">$</span>
              <Input
                id={`price-${plan}`}
                type="number"
                inputMode="numeric"
                min={0}
                className="pl-6"
                value={prices[plan]}
                onChange={(e) => setPrice(plan, Math.max(0, Math.round(Number(e.target.value) || 0)))}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Guides({ guides, ctx, brand }: { guides: Guide[]; ctx: KitContext; brand: string }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Guides for every group</CardTitle>
        <CardDescription>Pricing, the first call, objections and what happens after a yes.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={guides[0]?.id}>
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList>
              {guides.map((g) => (
                <TabsTrigger key={g.id} value={g.id}>
                  {g.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {guides.map((g) => (
            <TabsContent key={g.id} value={g.id} className="space-y-3 pt-2">
              <KitMarkdown source={g.body.replace(/^## /gm, "### ")} ctx={ctx} />
              <Button variant="outline" size="sm" onClick={() => download(`${slug(brand)}-${g.id}.md`, `# ${g.title}\n\n${fill(g.body, ctx)}\n`)}>
                <DownloadIcon data-icon="inline-start" />
                Download
              </Button>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
