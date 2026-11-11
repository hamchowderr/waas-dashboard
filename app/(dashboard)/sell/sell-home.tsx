"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRightIcon, CircleDollarSignIcon, DownloadIcon } from "lucide-react";

import { useSellPrices } from "@/hooks/use-sell-prices";
import { LIST_COST, PLANS, PLAN_NAMES, fill, keep, type GroupId, type Guide, type KitContext, type Plan } from "@/lib/sales-kit";
import { KitMarkdown } from "@/components/admin/kit-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardIcon } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "cn";
import { GroupIcon, download, slug } from "./kit-ui";
import { ProspectFinder } from "./prospect-finder";
import { WebsiteCheck } from "./website-check";

export type GroupSummary = { id: GroupId; title: string; plan: Plan; who: string; finder: string[] };

export function SellHome({
  productId,
  groups,
  guides,
  context
}: {
  productId: string;
  groups: GroupSummary[];
  guides: Guide[];
  context: Omit<KitContext, "prices" | "plan">;
}) {
  const [prices, setPrice] = useSellPrices(productId);
  const [tab, setTab] = React.useState("groups");
  const [checkUrl, setCheckUrl] = React.useState<{ url: string; n: number } | null>(null);
  const openCheck = (url: string) => {
    setCheckUrl((prev) => ({ url, n: (prev?.n ?? 0) + 1 }));
    setTab("check");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-4 lg:gap-6">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <TabsList className="max-w-full justify-start overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabsTrigger value="groups">Who to sell to</TabsTrigger>
        <TabsTrigger value="find">Find prospects</TabsTrigger>
        <TabsTrigger value="check">Website check</TabsTrigger>
        <TabsTrigger value="prices">Your prices</TabsTrigger>
        <TabsTrigger value="guides">Guides</TabsTrigger>
      </TabsList>
      </div>

      <TabsContent value="groups">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:gap-4">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/sell/${g.id}?product=${encodeURIComponent(productId)}`}
              className="group/card bg-card hover:border-foreground/20 focus-visible:ring-ring/50 flex flex-col rounded-[1.125rem] border p-4 transition-colors outline-none focus-visible:ring-3"
            >
              <div className="flex items-center gap-3">
                <GroupIcon id={g.id} />
                <h2 className="text-sm leading-snug font-semibold">{g.title}</h2>
              </div>
              <p className="text-muted-foreground mt-3 text-sm text-pretty">{g.who}</p>
              <div className="mt-auto flex items-end justify-between gap-2 border-t pt-3 [margin-top:max(1.25rem,auto)]">
                <div>
                  <p className="text-muted-foreground text-xs">{PLAN_NAMES[g.plan]}</p>
                  <p className="text-sm font-medium tabular-nums">
                    ${prices[g.plan]}/mo <span className="text-muted-foreground font-normal">· you keep ${keep(g.plan, prices[g.plan])}</span>
                  </p>
                </div>
                <ArrowRightIcon className="text-muted-foreground group-hover/card:text-foreground size-4 shrink-0 transition-transform group-hover/card:translate-x-0.5" aria-hidden />
              </div>
            </Link>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="find" forceMount className="data-[state=inactive]:hidden">
        <ProspectFinder productId={productId} groups={groups} onCheck={openCheck} />
      </TabsContent>

      <TabsContent value="check">
        <WebsiteCheck key={checkUrl?.n ?? 0} productId={productId} sender={context.sender} brand={context.brand} initialUrl={checkUrl?.url} />
      </TabsContent>

      <TabsContent value="prices">
        <Prices prices={prices} setPrice={setPrice} />
      </TabsContent>

      <TabsContent value="guides">
        <Guides guides={guides} ctx={{ ...context, prices }} />
      </TabsContent>
    </Tabs>
  );
}

function Prices({ prices, setPrice }: { prices: Record<Plan, number>; setPrice: (plan: Plan, value: number) => void }) {
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardIcon>
          <CircleDollarSignIcon />
        </CardIcon>
        <CardTitle>What you charge</CardTitle>
        <CardDescription>
          Your monthly price for each plan. Every message, offer sheet and deck uses these. Suggested prices are filled in until you change them, and they&apos;re kept in this browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground text-left text-xs">
            <tr className="border-b">
              <th className="py-2 pr-3 font-medium">Plan</th>
              <th className="py-2 pr-3 font-medium">Your cost</th>
              <th className="py-2 pr-3 font-medium">Your price</th>
              <th className="py-2 text-right font-medium">You keep</th>
            </tr>
          </thead>
          <tbody>
            {PLANS.map((plan) => (
              <tr key={plan} className="border-b last:border-0">
                <td className="py-2.5 pr-3 font-medium whitespace-nowrap">{PLAN_NAMES[plan]}</td>
                <td className="text-muted-foreground py-2.5 pr-3 tabular-nums">${LIST_COST[plan]}</td>
                <td className="py-2.5 pr-3">
                  <div className="relative w-24">
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2">$</span>
                    <Input
                      aria-label={`Your price for ${PLAN_NAMES[plan]}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className="pl-6 tabular-nums"
                      value={prices[plan]}
                      onChange={(e) => setPrice(plan, Math.max(0, Math.round(Number(e.target.value) || 0)))}
                    />
                  </div>
                </td>
                <td className="py-2.5 text-right font-medium tabular-nums">${keep(plan, prices[plan])}/mo</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-muted-foreground mt-3 text-xs">Costs are for a Small site billed monthly. Your cost drops 10%, 20% and 30% at 3, 10 and 25 sites.</p>
      </CardContent>
    </Card>
  );
}

function Guides({ guides, ctx }: { guides: Guide[]; ctx: KitContext }) {
  const [open, setOpen] = React.useState(guides[0]?.id);
  const guide = guides.find((g) => g.id === open) ?? guides[0];
  if (!guide) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-[14rem_1fr] lg:gap-6">
      <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Guides">
        {guides.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setOpen(g.id)}
            aria-current={g.id === guide.id}
            className={cn(
              "hover:bg-muted rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap transition-colors",
              g.id === guide.id ? "bg-muted font-medium" : "text-muted-foreground"
            )}
          >
            {g.title}
          </button>
        ))}
      </nav>
      <Card className="min-w-0">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <CardTitle>{guide.title}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => download(`${slug(ctx.brand)}-${guide.id}.md`, `# ${guide.title}\n\n${fill(guide.body, ctx)}\n`)}>
            <DownloadIcon data-icon="inline-start" />
            Download
          </Button>
        </CardHeader>
        <CardContent>
          <KitMarkdown source={guide.body.replace(/^## /gm, "### ")} ctx={ctx} />
        </CardContent>
      </Card>
    </div>
  );
}
