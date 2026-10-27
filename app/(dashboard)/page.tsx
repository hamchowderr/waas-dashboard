import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArchiveIcon,
  Check,
  ChevronRight,
  ExternalLinkIcon,
  InboxIcon,
  KeyRoundIcon,
  Loader2Icon,
  PaletteIcon,
  ServerIcon,
  StoreIcon,
  UsersIcon,
  type LucideIcon
} from "lucide-react";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import type { Overview } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { formatDateTime, jobTypeLabel } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { TakeTourButton } from "@/components/shell/dashboard-tour";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

/** A customer's first steps, each on the page that does it. */
const firstSteps: { title: string; detail: string; href: string; icon: LucideIcon }[] = [
  { title: "Make a store", detail: "Start a new site, or move one in from another host.", href: "/stores", icon: StoreIcon },
  { title: "Invite your team", detail: "Who can sign in here, and who can only look.", href: "/team", icon: UsersIcon },
  { title: "Add your brand", detail: "Your name, logo and color on this dashboard.", href: "/branding", icon: PaletteIcon },
  { title: "Connect your shop or app", detail: "API keys for the WaaS Host plugin, n8n, Zapier or your own code.", href: "/keys", icon: KeyRoundIcon }
];

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  const api = getAdminApi();
  const viewer = await getViewer().catch(() => null);
  const isAdmin = viewer?.isAdmin ?? false;
  const [overview, jobs, pending] = await Promise.all([
    api.overview(product),
    api.jobs({ productId: product }),
    // An API without applications yet answers 404: none waiting.
    isAdmin && !product ? api.applications("pending").catch(() => []) : Promise.resolve([])
  ]);
  // A customer sees their own storefront only, so the overview is about it.
  const storefront = product
    ? overview.products.find((p) => p.id === product)
    : !isAdmin && overview.products.length === 1
      ? overview.products[0]
      : undefined;
  const shop = !isAdmin && storefront ? await api.storefront(storefront.id).catch(() => null) : null;
  const failedJobs = jobs.items.filter((job) => job.state === "failed");
  const { health } = overview;
  const t = overview.tenants;
  const breakdown = [
    { label: "Ready", value: readyCount(overview), bar: "bg-green-600 dark:bg-green-400", state: "ready" },
    { label: "Suspended", value: t.suspended, bar: "bg-zinc-400 dark:bg-zinc-500", state: "suspended" },
    { label: "In progress", value: t.pending + t.removing, bar: "bg-orange-500 dark:bg-orange-400", state: "pending" },
    { label: "Failed", value: t.failed, bar: "bg-rose-600 dark:bg-rose-400", state: "failed" }
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

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader title={storefront ? storefront.name : "Overview"} description={`${storefront ? "Your storefront" : "All storefronts"} · updated ${formatDateTime(health.checkedAt)}`}>
        <div className="flex items-center gap-2">
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

      <div className="grid items-start gap-4 lg:gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" data-tour-step-id="needs-you">
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
              <div className="flex items-center gap-3 rounded-lg border border-green-600/20 bg-green-600/5 p-4 text-sm">
                <span className="flex size-9 shrink-0 items-center justify-center rounded bg-emerald-500 text-white">
                  <Check className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block font-medium">All clear</span>
                  <span className="text-muted-foreground">
                    {plural(readyCount(overview), "store")} ready{t.suspended > 0 ? `, ${t.suspended} suspended` : ""}.
                  </span>
                </span>
              </div>
            ) : (
              <ul className="divide-y">
                {todos.map((todo) => (
                  <li key={todo.key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded text-white",
                        todo.tone === "critical" ? "bg-red-500" : "bg-yellow-500"
                      )}>
                      <todo.icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{todo.title}</p>
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

        <Card>
          <CardHeader>
            <CardTitle>Stores</CardTitle>
            <CardDescription>{plural(t.total, "store")}</CardDescription>
            <CardAction>
              <Link
                href={withProduct("/stores", product)}
                className="text-primary inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline pointer-coarse:min-h-11">
                All
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              {breakdown
                .filter((b) => b.value > 0)
                .map((b) => (
                  <span key={b.label} className={cn("h-full", b.bar)} style={{ width: `${(b.value / Math.max(t.total, 1)) * 100}%` }} />
                ))}
            </div>
            <ul className="space-y-1">
              {breakdown.map((b) => (
                <li key={b.label}>
                  <Link
                    href={withProduct(`/stores?state=${b.state}`, product)}
                    className="hover:bg-muted/60 -mx-2 flex items-center justify-between rounded-md px-2 py-1 text-sm pointer-coarse:min-h-11">
                    <span className="flex items-center gap-2">
                      <span className={cn("size-2.5 rounded-full", b.bar)} />
                      <span className="text-muted-foreground">{b.label}</span>
                    </span>
                    <span className="font-medium tabular-nums">{b.value}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* A customer's first steps, until their storefront is set up; the platform admin knows the way. */}
      {!isAdmin && (
        <Card data-tour-step-id="start-here">
          <CardHeader>
            <CardTitle className="text-lg">Start here</CardTitle>
            <CardDescription>
              {shop ? (
                <>
                  Your shop is{" "}
                  <a href={`https://${shop.domain}`} target="_blank" rel="noreferrer" className="text-foreground inline-flex items-center gap-1 hover:underline">
                    {shop.domain}
                    <ExternalLinkIcon className="size-3.5" aria-hidden />
                  </a>
                </>
              ) : (
                "The pages you need first. The sidebar has the rest."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {firstSteps.map((step) => (
                <li key={step.href}>
                  <Link
                    href={step.href}
                    className="hover:bg-muted/60 focus-visible:ring-ring/50 flex h-full items-start gap-3 rounded-lg border p-3 outline-none focus-visible:ring-3">
                    <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md border">
                      <step.icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 text-sm">
                      <span className="flex items-center gap-1.5 font-medium">
                        {step.title}
                        {step.href === "/stores" && t.total > 0 && (
                          <Check className="size-4 text-green-600 dark:text-green-400" aria-label="Done" />
                        )}
                      </span>
                      <span className="text-muted-foreground block">{step.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
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
          ? "border-green-600/30 text-green-700 dark:border-green-400/30 dark:text-green-400"
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
