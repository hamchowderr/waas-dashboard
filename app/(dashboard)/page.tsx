import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArchiveIcon,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlertIcon,
  CircleCheckIcon,
  HistoryIcon,
  HourglassIcon,
  InboxIcon,
  ListChecksIcon,
  Loader2Icon,
  LoaderCircleIcon,
  ServerIcon,
  StoreIcon,
  type LucideIcon
} from "lucide-react";

import { canChange, getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import type { Job, Overview, ResellerSetup, Setup, SetupStep, StorefrontSetup } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { formatAgo, formatDateTime, jobTypeLabel, plainError } from "@/lib/format";
import { EmptyState } from "@/components/admin/empty-state";
import { JobStateBadge } from "@/components/admin/job-state-badge";
import { PageHeader } from "@/components/admin/page-header";
import { StatTiles, type Stat } from "@/components/admin/stat-tile";
import { SetupProgress, SetupSteps } from "@/components/admin/setup-checklist";
import { TakeTourButton } from "@/components/shell/dashboard-tour";
import { NewSite } from "./stores/new-site";
import { RetryTask } from "./retry-task";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardIcon, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Overview" };

/** One thing that needs the person, with the button that deals with it. critical: broken; waiting: someone is waiting on them. */
type Todo = { key: string; tone: "critical" | "waiting"; icon: LucideIcon; title: string; detail: string | null; action: string; href: string; retry?: string };

/** Links keep the chosen storefront, so the next page shows the same one. */
function withProduct(href: string, product?: string): string {
  if (!product) return href;
  return `${href}${href.includes("?") ? "&" : "?"}product=${encodeURIComponent(product)}`;
}

/** The API prefixes errors with the part that failed; the person needs the cause, starting with a capital. */

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
  const [overview, jobs, pending, setup, products] = await Promise.all([
    api.overview(product),
    api.jobs({ productId: product }),
    // An API without applications yet answers 404: none waiting.
    isAdmin && !product ? api.applications("pending").catch(() => []) : Promise.resolve([]),
    // An API without setup checklists yet: the cards are left out.
    api.setup().catch((): Setup | null => null),
    viewer && canChange(viewer) ? api.products().catch(() => []) : Promise.resolve([])
  ]);
  // A new site goes to the storefront in view, or any of the person's storefronts.
  const newSiteChoices = (product ? products.filter((p) => p.id === product) : products).map((p) => ({ id: p.id, name: p.name, highlevelAgency: p.highlevelAgency }));
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
  // Retrying is a change, so only for someone who may change things.
  const canRetry = !!viewer && canChange(viewer);
  const { health } = overview;
  const t = overview.tenants;

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
    // A domain whose DNS doesn't point at us fails again on retry; the fix is the DNS records.
    const dns = job.type === "tenant.domains" && !!job.tenantId && /\bDNS\b/.test(job.error ?? "");
    todos.push({
      key: job.id,
      tone: "critical",
      icon: AlertTriangle,
      title: `${jobTypeLabel(job.type)} failed${job.targetName ? ` · ${job.targetName}` : ""}`,
      // The API prefixes errors with the part that failed; the person needs the cause, not our internals.
      detail: plainError(job.error),
      retry: canRetry && !dns ? job.id : undefined,
      action: dns ? "Check DNS" : job.tenantId ? "Open store" : "See task",
      href: dns ? `/stores/${job.tenantId}#domains` : job.tenantId ? `/stores/${job.tenantId}` : "/jobs?state=failed"
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
      detail: "Open Backups to see which store and why.",
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

  // The same count as the "Needs you" list: failed tasks, or failed stores when no task says why, and failed backups.
  const storeProblems = failedJobs.length > 0 ? failedJobs.length : t.failed;
  const problems = storeProblems + overview.backups.failed;
  const building = t.pending + t.removing;
  const tiles: Stat[] = [
    {
      label: "Ready",
      value: readyCount(overview),
      note: t.suspended > 0 ? `${t.suspended} suspended` : "Running and online",
      icon: CircleCheckIcon,
      tone: "success",
      href: withProduct("/stores?state=ready", product)
    },
    {
      label: "In progress",
      value: building,
      note: building > 0 ? "Finishes on its own" : "Nothing building",
      icon: LoaderCircleIcon,
      tone: building > 0 ? "warning" : "neutral",
      href: withProduct("/stores?state=pending", product)
    },
    {
      label: "Failed tasks",
      value: problems,
      note: problems > 0 ? "Listed under Needs you" : "Nothing broken",
      icon: AlertTriangle,
      tone: problems > 0 ? "danger" : "neutral",
      href: withProduct(failedJobs.length > 0 ? "/jobs?state=failed" : t.failed > 0 ? "/stores?state=failed" : "/backups", product)
    },
    {
      label: "Backups",
      value: overview.backups.total,
      note: overview.backups.pending > 0 ? `${overview.backups.pending} saving now` : "Kept off the server",
      icon: ArchiveIcon,
      href: withProduct("/backups", product)
    }
  ];
  const recent = [...jobs.items].sort((a, b) => jobTime(b).localeCompare(jobTime(a))).slice(0, 6);

  return (
    <div className="space-y-5 lg:space-y-7">
      <PageHeader title={storefront ? storefront.name : "Overview"} description={`${storefront ? "Your storefront" : "All storefronts"} · updated ${formatDateTime(health.checkedAt)}`}>
        <div className="flex flex-wrap items-center gap-2">
          <HealthBadge ok={health.ok} />
          <TakeTourButton />
          {newSiteChoices.length > 0 ? (
            <NewSite products={newSiteChoices} />
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href={withProduct("/stores", product)}>
                <StoreIcon aria-hidden />
                Stores
              </Link>
            </Button>
          )}
        </div>
      </PageHeader>

      <StatTiles stats={tiles} label="Your stores at a glance" />

      <div className="grid grid-cols-1 items-start gap-5 lg:gap-7 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
        <div className="min-w-0 space-y-5 lg:space-y-7">
          <Card data-tour-step-id={isAdmin || showChecklist ? "needs-you" : "needs-you start-here"}>
            <CardHeader>
              <CardIcon>
                <CircleAlertIcon />
              </CardIcon>
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
                    <li key={todo.key} className="bg-muted flex flex-wrap items-center gap-3 rounded-2xl p-3">
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-full",
                          todo.tone === "critical"
                            ? "bg-rose-600/12 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300"
                            : "bg-amber-500/15 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300"
                        )}>
                        <todo.icon className="size-4.5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1 max-sm:basis-[calc(100%-3.25rem)]">
                        <p className="text-sm font-semibold">{todo.title}</p>
                        {todo.detail && <p className="text-muted-foreground line-clamp-2 text-sm">{todo.detail}</p>}
                      </div>
                      <div className="flex shrink-0 gap-2 max-sm:ms-13">
                      {todo.retry && <RetryTask failureId={todo.retry} label={todo.title.split(" failed")[0]} />}
                      <Button asChild size="sm" variant="outline">
                        <Link href={todo.href.startsWith("/stores/") || todo.href === "/applications" ? todo.href : withProduct(todo.href, product)}>
                          {todo.action}
                          <ChevronRight aria-hidden />
                        </Link>
                      </Button>
                      </div>
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

        <RecentActivity jobs={recent} href={withProduct("/jobs", product)} />
      </div>
    </div>
  );
}

/** When a task last moved: when it failed, started or was queued. */
const jobTime = (job: Job) => job.failedAt ?? job.startedAt ?? job.createdAt ?? "";

/** The last few tasks, newest first, so the page says what just happened without opening the log. */
function RecentActivity({ jobs, href }: { jobs: Job[]; href: string }) {
  return (
    <Card className="xl:sticky xl:top-20">
      <CardHeader>
        <CardIcon>
          <HistoryIcon />
        </CardIcon>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>The latest tasks</CardDescription>
        <CardAction inline>
          <Link
            href={href}
            className="text-primary inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline pointer-coarse:min-h-11">
            All
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <EmptyState icon={HistoryIcon} title="Nothing yet">
            Builds, backups and changes show here as they run.
          </EmptyState>
        ) : (
          <ul className="divide-y">
            {jobs.map((job) => (
              <li key={job.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{jobTypeLabel(job.type)}</span>
                  <span className="text-muted-foreground block text-xs">
                    {[job.targetName, formatAgo(jobTime(job))].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <JobStateBadge state={job.state} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
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
        <CardIcon>
          <ListChecksIcon />
        </CardIcon>
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
        <CardIcon>
          <ListChecksIcon />
        </CardIcon>
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
        <CardIcon>
          <HourglassIcon />
        </CardIcon>
        <CardTitle className="text-lg">Stuck in setup</CardTitle>
        <CardDescription>
          {stuck.length
            ? `${plural(stuck.length, "account")} with no setup step done for a week.`
            : "Nobody is stuck: every account in setup moved forward this week."}{" "}
          {finished} of {plural(setup.storefronts.length, "storefront")} fully set up.
        </CardDescription>
        <CardAction inline>
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
                <TableCell className="min-w-36 pl-3 whitespace-normal">
                  {forCustomer ? (
                    <span className="font-medium">{row.name}</span>
                  ) : (
                    <Link href={href} className="font-medium hover:underline">
                      {row.name}
                    </Link>
                  )}
                  {showQuiet && (
                    <span className="text-muted-foreground block text-xs">
                      {isReseller ? "Reseller" : "Storefront"}
                      <span className="md:hidden"> · last step {formatAgo(row.lastProgressAt)}</span>
                    </span>
                  )}
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
