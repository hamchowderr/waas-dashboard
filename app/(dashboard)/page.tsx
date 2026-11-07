import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArchiveIcon,
  Check,
  ChevronDown,
  ChevronRight,
  GlobeIcon,
  HammerIcon,
  InboxIcon,
  Loader2Icon,
  ServerIcon,
  StoreIcon,
  type LucideIcon
} from "lucide-react";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import type { Overview, ResellerSetup, Setup, SetupStep, StorefrontSetup } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { formatAgo, formatDateTime, jobTypeLabel } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { SetupProgress, SetupSteps } from "@/components/admin/setup-checklist";
import { TakeTourButton } from "@/components/shell/dashboard-tour";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Overview" };

/** One thing that needs the person, with the button that deals with it. critical: broken; waiting: someone is waiting on them. */
type Todo = { key: string; tone: "critical" | "waiting"; icon: LucideIcon; title: string; detail: string | null; action: string; href: string };

/** Links keep the chosen storefront, so the next page shows the same one. */
function withProduct(href: string, product?: string): string {
  if (!product) return href;
  return `${href}${href.includes("?") ? "&" : "?"}product=${encodeURIComponent(product)}`;
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Ready, suspended, pending and failed add up to the total; a suspended store is a ready one that is switched off. */
function readyCount(o: Overview): number {
  return Math.max(o.tenants.done - o.tenants.suspended, 0);
}

/** What is going on right now that needs nobody: builds and tasks in progress. */
function inProgress(o: Overview): string | null {
  const parts = [];
  const building = o.tenants.pending + o.tenants.removing;
  if (building > 0) parts.push(`${plural(building, "store")} being built or removed`);
  if (o.jobs.queued + o.jobs.running > 0) parts.push(`${plural(o.jobs.queued + o.jobs.running, "task")} running or waiting`);
  if (o.backups.pending > 0) parts.push(`${plural(o.backups.pending, "backup")} in progress`);
  return parts.length ? parts.join(" · ") : null;
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  const api = getAdminApi();
  const viewer = await getViewer().catch(() => null);
  const isAdmin = viewer?.isAdmin ?? false;
  const [overview, jobs, pending, setup] = await Promise.all([
    api.overview(product),
    api.jobs({ productId: product }),
    // An API without applications yet answers 404: none waiting.
    isAdmin && !product ? api.applications("pending").catch(() => []) : Promise.resolve([]),
    // An API without setup checklists yet: the cards are left out.
    api.setup().catch((): Setup | null => null)
  ]);
  // A customer sees their own storefront only, so the overview is about it.
  const storefront = product
    ? overview.products.find((p) => p.id === product)
    : !isAdmin && overview.products.length === 1
      ? overview.products[0]
      : undefined;
  // The checklists this page shows: the storefront in view, and on a reseller's team the reseller's own.
  const storefrontSetup = storefront && setup?.storefronts.find((s) => s.productId === storefront.id);
  const resellerSetup = !isAdmin && viewer?.active?.resellerId ? setup?.resellers.find((r) => r.resellerId === viewer.active?.resellerId) : undefined;
  const showChecklist = !!storefrontSetup && storefrontSetup.done < storefrontSetup.total;
  const stuck = isAdmin && !product && setup ? [...setup.resellers, ...setup.storefronts].filter((s) => s.stuck) : [];
  const failedJobs = jobs.items.filter((job) => job.state === "failed");
  const { health } = overview;
  const t = overview.tenants;
  const breakdown = [
    { label: "Ready", value: readyCount(overview), bar: "bg-green-600 dark:bg-green-400", stroke: "stroke-green-600 dark:stroke-green-400", state: "ready" },
    { label: "Suspended", value: t.suspended, bar: "bg-stone-400 dark:bg-stone-500", stroke: "stroke-stone-400 dark:stroke-stone-500", state: "suspended" },
    { label: "In progress", value: t.pending + t.removing, bar: "bg-amber-500 dark:bg-amber-400", stroke: "stroke-amber-500 dark:stroke-amber-400", state: "pending" },
    { label: "Failed", value: t.failed, bar: "bg-rose-600 dark:bg-rose-400", stroke: "stroke-rose-600 dark:stroke-rose-400", state: "failed" }
  ];

  // Most urgent first: the platform itself, then broken stores and tasks, then people waiting on an answer.
  const todos: Todo[] = [];
  if (isAdmin && !health.ok) {
    const down = [health.checks.database !== "up" && "database", health.checks.queue !== "up" && "task queue"].filter(Boolean);
    todos.push({
      key: "health",
      tone: "critical",
      icon: ServerIcon,
      title: "The provisioning API has a problem",
      detail: down.length ? `Not answering: ${down.join(" and ")}. New stores and changes wait until it is back.` : "New stores and changes wait until it is back.",
      action: "See activity",
      href: "/jobs"
    });
  }
  for (const job of failedJobs.slice(0, 5)) {
    todos.push({
      key: job.id,
      tone: "critical",
      icon: AlertTriangle,
      title: `${jobTypeLabel(job.type)} failed${job.targetName ? ` · ${job.targetName}` : ""}`,
      detail: job.error,
      action: job.tenantId ? "Open store" : "See task",
      href: job.tenantId ? `/stores/${job.tenantId}` : "/jobs?state=failed"
    });
  }
  if (failedJobs.length > 5) {
    todos.push({
      key: "more-jobs",
      tone: "critical",
      icon: AlertTriangle,
      title: `${plural(failedJobs.length - 5, "more failed task")}`,
      detail: null,
      action: "See all",
      href: "/jobs?state=failed"
    });
  }
  if (t.failed > 0 && failedJobs.length === 0) {
    todos.push({
      key: "stores",
      tone: "critical",
      icon: StoreIcon,
      title: `${plural(t.failed, "store")} failed to build`,
      detail: "Open each one to retry or remove it.",
      action: "See failed stores",
      href: "/stores?state=failed"
    });
  }
  if (overview.backups.failed > 0) {
    todos.push({
      key: "backups",
      tone: "critical",
      icon: ArchiveIcon,
      title: `${plural(overview.backups.failed, "backup")} failed`,
      detail: "Take a new backup from the store's page.",
      action: "See backups",
      href: "/backups"
    });
  }
  if (pending.length > 0) {
    todos.push({
      key: "applications",
      tone: "waiting",
      icon: InboxIcon,
      title: `${plural(pending.length, "seller application")} waiting`,
      detail: pending
        .slice(0, 3)
        .map((a) => a.business || a.name)
        .join(", "),
      action: "Review",
      href: "/applications"
    });
  }
  const busy = inProgress(overview);

  const tiles: StatTile[] = [
    {
      label: "Live",
      value: readyCount(overview),
      note: t.suspended > 0 ? `${t.suspended} switched off` : "Running and online",
      icon: GlobeIcon,
      tone: "green",
      href: withProduct("/stores?state=ready", product)
    },
    {
      label: "Being built",
      value: t.pending + t.removing,
      note: t.pending + t.removing > 0 ? "Updates on its own" : "Nothing in progress",
      icon: HammerIcon,
      tone: "amber",
      href: withProduct("/stores?state=pending", product)
    },
    {
      label: "Need a look",
      value: t.failed + overview.backups.failed,
      note: t.failed + overview.backups.failed > 0 ? "Open to fix" : "Nothing broken",
      icon: AlertTriangle,
      tone: "rose",
      href: withProduct(t.failed > 0 ? "/stores?state=failed" : "/backups", product)
    },
    {
      label: "Backups",
      value: overview.backups.total,
      note: overview.backups.pending > 0 ? `${overview.backups.pending} saving now` : "Kept safe off the server",
      icon: ArchiveIcon,
      tone: "violet",
      href: withProduct("/backups", product)
    }
  ];

  return (
    <div className="space-y-5 lg:space-y-7">
      <PageHeader title={storefront ? storefront.name : "Overview"} description={`${storefront ? "Your storefront" : "All storefronts"} · updated ${formatDateTime(health.checkedAt)}`}>
        <div className="flex flex-wrap items-center gap-2">
          <HealthBadge ok={health.ok} />
          <TakeTourButton />
          <Button asChild size="sm">
            <Link href={withProduct("/stores", product)}>
              <StoreIcon aria-hidden />
              Stores
            </Link>
          </Button>
        </div>
      </PageHeader>

      <ul className="grid grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-4" aria-label="Your stores at a glance">
        {tiles.map((tile) => (
          <li key={tile.label}>
            <StatTileCard tile={tile} />
          </li>
        ))}
      </ul>

      <div className="grid items-start gap-5 lg:gap-7 xl:grid-cols-3">
        <div className="space-y-5 lg:space-y-7 xl:col-span-2">
          <Card data-tour-step-id={isAdmin || showChecklist ? "needs-you" : "needs-you start-here"}>
            <CardHeader>
              <CardTitle className="text-lg">{todos.length ? "Needs you" : "Nothing needs you"}</CardTitle>
              <CardDescription>
                {todos.length
                  ? "Broken things first. Each button goes to the page that fixes it."
                  : `Every store is running${busy ? "" : " and nothing is waiting"}.`}
                {busy && (
                  <span className="mt-1 flex items-center gap-1.5">
                    <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
                    {busy}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todos.length === 0 ? (
                <div className="flex items-center gap-4 rounded-2xl bg-green-600/8 p-4 text-sm dark:bg-green-400/10">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-white ring-4 ring-green-600/15 dark:bg-green-500">
                    <Check className="size-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold">All clear</span>
                    <span className="text-muted-foreground">
                      {plural(readyCount(overview), "store")} ready{t.suspended > 0 ? `, ${t.suspended} suspended` : ""}.
                    </span>
                  </span>
                </div>
              ) : (
                <ul className="space-y-2">
                  {todos.map((todo) => (
                    <li key={todo.key} className="bg-muted flex items-center gap-3 rounded-2xl p-3">
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-full",
                          todo.tone === "critical" ? TONES.rose : TONES.amber
                        )}>
                        <todo.icon className="size-4.5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{todo.title}</p>
                        {todo.detail && <p className="text-muted-foreground truncate text-sm">{todo.detail}</p>}
                      </div>
                      <Button asChild size="sm" variant="outline" className="shrink-0">
                        <Link href={todo.href.startsWith("/stores/") || todo.href === "/applications" ? todo.href : withProduct(todo.href, product)}>
                          {todo.action}
                          <ChevronRight aria-hidden />
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {showChecklist && (
            <StorefrontChecklist setup={storefrontSetup!} productId={isAdmin ? storefrontSetup!.productId : undefined} />
          )}
          {resellerSetup && resellerSetup.done < resellerSetup.total && (
            <ResellerChecklist setup={resellerSetup} storefronts={setup!.storefronts.filter((s) => s.resellerId === resellerSetup.resellerId)} />
          )}
          {isAdmin && !product && setup && <StuckCard stuck={stuck} setup={setup} />}
        </div>

        <Card className="xl:sticky xl:top-20">
          <CardHeader>
            <CardTitle>Stores</CardTitle>
            <CardDescription>{plural(t.total, "store")}</CardDescription>
            <CardAction>
              <Link
                href={withProduct("/stores", product)}
                className="text-primary inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline pointer-coarse:min-h-11">
                All
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-5">
            <StoresDonut breakdown={breakdown} total={t.total} />
            <ul className="space-y-1">
              {breakdown.map((b) => (
                <li key={b.label}>
                  <Link
                    href={withProduct(`/stores?state=${b.state}`, product)}
                    className="hover:bg-muted -mx-2 flex items-center justify-between rounded-xl px-2.5 py-1.5 text-sm pointer-coarse:min-h-11">
                    <span className="flex items-center gap-2.5">
                      <span className={cn("size-2.5 rounded-full", b.bar)} />
                      <span className="text-muted-foreground">{b.label}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{b.value}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Soft tinted chips for icons: the colour says what kind of thing it is. */
const TONES = {
  green: "bg-green-600/12 text-green-700 dark:bg-green-400/15 dark:text-green-300",
  amber: "bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  rose: "bg-rose-600/12 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300",
  violet: "bg-fuchsia-600/10 text-fuchsia-700 dark:bg-fuchsia-400/15 dark:text-fuchsia-300"
} as const;

type StatTile = { label: string; value: number; note: string; icon: LucideIcon; tone: keyof typeof TONES; href: string };

function StatTileCard({ tile }: { tile: StatTile }) {
  return (
    <Link
      href={tile.href}
      className="bg-card shadow-card group flex h-full flex-col gap-3 rounded-[1.375rem] p-4 transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none sm:p-5 dark:ring-1 dark:ring-white/6">
      <span className="flex items-center justify-between">
        <span className={cn("flex size-10 items-center justify-center rounded-full", TONES[tile.tone])}>
          <tile.icon className="size-4.5" aria-hidden />
        </span>
        <ChevronRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </span>
      <span>
        <span className="block text-3xl font-extrabold tracking-[-0.03em] tabular-nums">{tile.value}</span>
        <span className="block text-sm font-semibold">{tile.label}</span>
        <span className="text-muted-foreground block text-xs">{tile.note}</span>
      </span>
    </Link>
  );
}

/** A ring split by store state, with the total in the middle. */
function StoresDonut({ breakdown, total }: { breakdown: { label: string; value: number; stroke: string }[]; total: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative mx-auto size-40">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" role="img" aria-label={breakdown.map((b) => `${b.label} ${b.value}`).join(", ")}>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="12" className="stroke-muted" />
        {total > 0 &&
          breakdown
            .filter((b) => b.value > 0)
            .map((b) => {
              const len = (b.value / total) * c;
              const seg = (
                <circle
                  key={b.label}
                  cx="60"
                  cy="60"
                  r={r}
                  fill="none"
                  strokeWidth="12"
                  strokeLinecap="butt"
                  className={b.stroke}
                  strokeDasharray={`${Math.max(len - 2, 0)} ${c}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return seg;
            })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold tracking-[-0.03em] tabular-nums">{total}</span>
        <span className="text-muted-foreground text-xs font-medium">{total === 1 ? "store" : "stores"}</span>
      </div>
    </div>
  );
}

function HealthBadge({ ok }: { ok: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5",
        ok
          ? "border-green-600/30 text-green-800 dark:border-green-400/30 dark:text-green-400"
          : "border-rose-600/30 text-rose-700 dark:border-rose-400/30 dark:text-rose-400"
      )}>
      <StatusDot up={ok} className="size-1.5" />
      {ok ? "All systems normal" : "Service problem"}
    </Badge>
  );
}

function StatusDot({ up, className }: { up: boolean; className?: string }) {
  return (
    <span
      className={cn("size-2 rounded-full", up ? "bg-green-600 dark:bg-green-400" : "bg-rose-600 dark:bg-rose-400", className)}
    />
  );
}

/** productId: set for the platform admin, whose links open the storefront's pages. */
function StorefrontChecklist({ setup, productId }: { setup: StorefrontSetup; productId?: string }) {
  return (
    <Card data-tour-step-id="start-here">
      <CardHeader>
        <CardTitle className="text-lg">Set up {setup.name}</CardTitle>
        <CardDescription>
          Each step ticks itself when it&apos;s done.{setup.next ? ` Next: ${setup.next}.` : ""}
        </CardDescription>
        <CardAction>
          <SetupProgress setup={setup} hideStuck={!productId} className="w-40 max-sm:hidden" />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <SetupProgress setup={setup} hideStuck={!productId} className="sm:hidden" />
        <SplitSteps steps={setup.steps} productId={productId} />
      </CardContent>
    </Card>
  );
}

function ResellerChecklist({ setup, storefronts }: { setup: ResellerSetup; storefronts: StorefrontSetup[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Set up {setup.name}</CardTitle>
        <CardDescription>Your reseller account, and how far each of your storefronts has got.</CardDescription>
        <CardAction>
          <SetupProgress setup={setup} hideStuck className="w-40 max-sm:hidden" />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <SetupProgress setup={setup} hideStuck className="sm:hidden" />
        <SplitSteps steps={setup.steps} />
        {storefronts.length > 0 && <SetupTable rows={storefronts} forCustomer />}
      </CardContent>
    </Card>
  );
}

/** The steps still to do, then the finished ones folded under one line so the list stays short. */
function SplitSteps({ steps, productId }: { steps: SetupStep[]; productId?: string }) {
  const open = steps.filter((s) => s.state !== "done");
  const done = steps.filter((s) => s.state === "done");
  return (
    <div className="space-y-3">
      {open.length > 0 && <SetupSteps steps={open} productId={productId} />}
      {done.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm font-semibold pointer-coarse:min-h-11">
            <span className="flex size-5 items-center justify-center rounded-full bg-green-600 text-white dark:bg-green-500">
              <Check className="size-3" aria-hidden />
            </span>
            {done.length} done
            <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <SetupSteps steps={done} productId={productId} />
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

/** Storefronts and resellers with no step done for a week. */
function StuckCard({ stuck, setup }: { stuck: (StorefrontSetup | ResellerSetup)[]; setup: Setup }) {
  const finished = setup.storefronts.filter((s) => s.done === s.total).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Stuck in setup</CardTitle>
        <CardDescription>
          {stuck.length
            ? `${plural(stuck.length, "account")} with no setup step done for a week.`
            : "Nobody is stuck: every account in setup moved forward this week."}{" "}
          {finished} of {plural(setup.storefronts.length, "storefront")} fully set up.
        </CardDescription>
        <CardAction>
          <Link
            href="/storefronts"
            className="text-primary inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline pointer-coarse:min-h-11">
            Storefronts
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </CardAction>
      </CardHeader>
      {stuck.length > 0 && (
        <CardContent>
          <SetupTable rows={stuck} showQuiet />
        </CardContent>
      )}
    </Card>
  );
}

/** One row per storefront or reseller: its progress and the next step; links open its checklist. */
function SetupTable({
  rows,
  showQuiet = false,
  forCustomer = false
}: {
  rows: (StorefrontSetup | ResellerSetup)[];
  showQuiet?: boolean;
  /** A reseller's own storefronts: they switch storefront at the top of the page, so names aren't links. */
  forCustomer?: boolean;
}) {
  return (
    <div className="bg-muted/60 overflow-hidden rounded-2xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-3">{showQuiet ? "Account" : "Storefront"}</TableHead>
            <TableHead className="w-40">Setup</TableHead>
            <TableHead className="max-sm:hidden">Next step</TableHead>
            {showQuiet && <TableHead className="pr-3 text-right max-md:hidden">Last step done</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isReseller = !("productId" in row);
            const href = isReseller ? `/resellers/${row.resellerId}` : `/?product=${encodeURIComponent((row as StorefrontSetup).productId)}`;
            return (
              <TableRow key={isReseller ? `r-${row.resellerId}` : (row as StorefrontSetup).productId}>
                <TableCell className="pl-3 whitespace-normal">
                  {forCustomer ? (
                    <span className="font-medium">{row.name}</span>
                  ) : (
                    <Link href={href} className="font-medium hover:underline">
                      {row.name}
                    </Link>
                  )}
                  {showQuiet && <span className="text-muted-foreground block text-xs">{isReseller ? "Reseller" : "Storefront"}</span>}
                  <span className="text-muted-foreground block text-xs sm:hidden">Next: {row.next ?? "done"}</span>
                </TableCell>
                <TableCell>
                  <SetupProgress setup={row} hideStuck={forCustomer} />
                </TableCell>
                <TableCell className="text-muted-foreground max-sm:hidden">{row.next ?? "Done"}</TableCell>
                {showQuiet && <TableCell className="text-muted-foreground pr-3 text-right max-md:hidden">{formatAgo(row.lastProgressAt)}</TableCell>}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
