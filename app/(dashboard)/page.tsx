import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  DatabaseIcon,
  Eye,
  ListChecksIcon,
  ServerIcon,
  type LucideIcon
} from "lucide-react";

import { getAdminApi } from "@/lib/api/client";
import type { Overview } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { formatAgo, formatDateTime, jobTypeLabel } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Overview" };

type Level = "within" | "observe" | "critical";

const levelStyle: Record<Level, { icon: LucideIcon; box: string; text: string }> = {
  within: { icon: Check, box: "bg-emerald-500 text-white", text: "text-emerald-800 dark:text-emerald-500" },
  observe: { icon: Eye, box: "bg-yellow-500 text-white", text: "text-yellow-800 dark:text-yellow-500" },
  critical: { icon: AlertTriangle, box: "bg-red-500 text-white", text: "text-red-800 dark:text-red-500" }
};

/** action: what the link at the bottom of the card opens. */
type Stat = { name: string; stat: string; note: string; level: Level; status: string; action: string; href: string };

/** Links keep the chosen storefront, so the next page shows the same one. */
function withProduct(href: string, product?: string): string {
  if (!product || href.startsWith("#")) return href;
  return `${href}${href.includes("?") ? "&" : "?"}product=${encodeURIComponent(product)}`;
}

function stats(o: Overview): Stat[] {
  const t = o.tenants;
  return [
    {
      name: "Provisioning API",
      stat: o.health.ok ? "Up" : "Down",
      note: `Checked ${formatAgo(o.health.checkedAt)}`,
      level: o.health.ok ? "within" : "critical",
      status: o.health.ok ? "Healthy" : "Not answering",
      action: "See status",
      href: "#health"
    },
    {
      name: "Stores",
      stat: String(o.tenants.total),
      note: storeNote(o),
      level: t.failed > 0 ? "critical" : t.pending + t.removing > 0 ? "observe" : "within",
      status: t.failed > 0 ? `${t.failed} failed` : "None failed",
      action: "See stores",
      href: t.failed > 0 ? "/stores?state=failed" : "/stores"
    },
    {
      name: "Background jobs",
      stat: String(o.jobs.queued + o.jobs.running),
      note: `${o.jobs.queued} queued · ${o.jobs.running} running`,
      level: o.jobs.failed > 0 ? "critical" : "within",
      status: o.jobs.failed > 0 ? `${o.jobs.failed} failed` : "None failed",
      action: "See jobs",
      href: o.jobs.failed > 0 ? "/jobs?state=failed" : "/jobs"
    },
    {
      name: "Backups",
      stat: String(o.backups.total),
      note: `${o.backups.done} ready · ${o.backups.pending} in progress`,
      level: o.backups.failed > 0 ? "critical" : o.backups.pending > 0 ? "observe" : "within",
      status: o.backups.failed > 0 ? `${o.backups.failed} failed` : "None failed",
      action: "See backups",
      href: "/backups"
    }
  ];
}

/** Ready, suspended, pending and failed add up to the total; a suspended store is a ready one that is switched off. */
function readyCount(o: Overview): number {
  return Math.max(o.tenants.done - o.tenants.suspended, 0);
}

function storeNote(o: Overview): string {
  const t = o.tenants;
  const parts = [`${readyCount(o)} ready`];
  if (t.suspended > 0) parts.push(`${t.suspended} suspended`);
  if (t.pending + t.removing > 0) parts.push(`${t.pending + t.removing} in progress`);
  return parts.join(" · ");
}

const services: { key: "api" | "database" | "queue"; name: string; icon: LucideIcon }[] = [
  { key: "api", name: "Provisioning API", icon: ServerIcon },
  { key: "database", name: "Database", icon: DatabaseIcon },
  { key: "queue", name: "Job queue", icon: ListChecksIcon }
];

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  const api = getAdminApi();
  const [overview, jobs] = await Promise.all([api.overview(product), api.jobs({ productId: product })]);
  const storefront = product ? overview.products.find((p) => p.id === product) : undefined;
  const failedJobs = jobs.items.filter((job) => job.state === "failed").slice(0, 5);
  const { health } = overview;
  const serviceUp = { api: health.ok, database: health.checks.database === "up", queue: health.checks.queue === "up" };
  const t = overview.tenants;
  const breakdown = [
    { label: "Ready", value: readyCount(overview), bar: "bg-green-600 dark:bg-green-400" },
    { label: "Suspended", value: t.suspended, bar: "bg-zinc-400 dark:bg-zinc-500" },
    { label: "Pending", value: t.pending, bar: "bg-orange-500 dark:bg-orange-400" },
    { label: "Removing", value: t.removing, bar: "bg-blue-500 dark:bg-blue-400" },
    { label: "Failed", value: t.failed, bar: "bg-rose-600 dark:bg-rose-400" }
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader title="Overview" description={`${storefront?.name ?? "All storefronts"} · updated ${formatDateTime(health.checkedAt)}`} />

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats(overview).map((item) => (
          <li key={item.name}>
            <StatCard stat={item} href={withProduct(item.href, product)} />
          </li>
        ))}
      </ul>

      <div className="grid items-start gap-4 lg:gap-6 xl:grid-cols-3">
        {/* Current state only, until uptime history exists. */}
        <Card id="health" className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Platform status</CardTitle>
            <CardDescription>From the API&apos;s health check, {formatAgo(health.checkedAt)}</CardDescription>
            <CardAction>
              <HealthBadge ok={health.ok} />
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-4">
              {services.map((service) => (
                <ServiceRow key={service.key} name={service.name} icon={service.icon} up={serviceUp[service.key]} />
              ))}
            </ul>
            <p className="bg-muted/50 text-muted-foreground rounded-lg border p-3 text-sm">
              Daily uptime history will show here once outside uptime monitoring is set up.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stores by status</CardTitle>
            <CardDescription>
              {overview.tenants.total} {overview.tenants.total === 1 ? "store" : "stores"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {breakdown
                .filter((b) => b.value > 0)
                .map((b) => (
                  <span
                    key={b.label}
                    className={cn("h-full", b.bar)}
                    style={{ width: `${(b.value / Math.max(overview.tenants.total, 1)) * 100}%` }}
                  />
                ))}
            </div>
            <div className="space-y-2">
              {breakdown.map((b) => (
                <div key={b.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2.5 rounded-full", b.bar)} />
                    <span className="text-muted-foreground">{b.label}</span>
                  </div>
                  <span className="font-medium tabular-nums">{b.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Failed jobs</CardTitle>
          <CardDescription>Jobs that used up their retries. The store or version shows Failed until it is fixed.</CardDescription>
          <CardAction>
            <Link
              href={withProduct("/jobs?state=failed", product)}
              className="text-primary inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline pointer-coarse:min-h-11">
              All failed jobs
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          {failedJobs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No failed jobs.</p>
          ) : (
            <ul className="divide-y">
              {failedJobs.map((job) => (
                <li key={job.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {jobTypeLabel(job.type)}
                      {job.targetName && (
                        <>
                          {" · "}
                          {job.tenantId ? (
                            <Link href={`/stores/${job.tenantId}`} className="hover:underline">
                              {job.targetName}
                            </Link>
                          ) : (
                            job.targetName
                          )}
                        </>
                      )}
                    </p>
                    <p className="text-muted-foreground truncate text-sm">{job.error}</p>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">{formatAgo(job.failedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** One headline number, with where to go next and how it is doing. The whole card is the link. */
function StatCard({ stat, href }: { stat: Stat; href: string }) {
  const { icon: Icon, box, text } = levelStyle[stat.level];
  return (
    <Card className="group relative h-full gap-6 p-6 transition-colors">
      <div>
        <p className="text-muted-foreground mb-1 text-sm">{stat.name}</p>
        <p className="text-foreground text-3xl font-bold">{stat.stat}</p>
        <p className="text-muted-foreground mt-1 text-xs">{stat.note}</p>
      </div>
      <Link
        href={href}
        className="bg-muted/60 group-hover:bg-muted focus-visible:ring-ring/50 flex items-center gap-3 rounded-md p-2 outline-none after:absolute after:inset-0 focus-visible:ring-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded", box)}>
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">
          <span className={cn("block font-medium", text)}>{stat.status}</span>
          <span className="text-muted-foreground block">{stat.action}</span>
        </span>
        <ChevronRight className="text-muted-foreground/60 group-hover:text-muted-foreground size-5 shrink-0" aria-hidden />
      </Link>
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
          ? "border-green-600/30 text-green-700 dark:border-green-400/30 dark:text-green-400"
          : "border-rose-600/30 text-rose-700 dark:border-rose-400/30 dark:text-rose-400"
      )}>
      <StatusDot up={ok} className="size-1.5" />
      {ok ? "All systems normal" : "Service problem"}
    </Badge>
  );
}

function ServiceRow({ name, icon: Icon, up }: { name: string; icon: LucideIcon; up: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-md border">
          <Icon className="text-foreground size-3.5" />
        </span>
        <span className="truncate text-sm font-medium">{name}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-sm">
        <StatusDot up={up} />
        <span className="font-medium">{up ? "Operational" : "Down"}</span>
      </span>
    </li>
  );
}

function StatusDot({ up, className }: { up: boolean; className?: string }) {
  return (
    <span
      className={cn("size-2 rounded-full", up ? "bg-green-600 dark:bg-green-400" : "bg-rose-600 dark:bg-rose-400", className)}
    />
  );
}
