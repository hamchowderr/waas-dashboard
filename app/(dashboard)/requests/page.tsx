import type { Metadata } from "next";
import Link from "next/link";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import type { RequestOutcome } from "@/lib/api/types";
import { REQUEST_WINDOWS, isRequestWindow, windowStart, type RequestWindow } from "@/lib/requests";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { RequestsTable } from "./requests-table";

export const metadata: Metadata = { title: "Requests" };

const outcomes = new Set<RequestOutcome>(["ok", "client-error", "server-error", "error"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** This page's address with one parameter changed (undefined drops it). */
function hrefWith(params: Record<string, string | undefined>, change: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...change })) if (value) search.set(key, value);
  const text = search.toString();
  return text ? `/requests?${text}` : "/requests";
}

export default async function RequestsPage({
  searchParams
}: {
  searchParams: Promise<{ product?: string; store?: string; outcome?: string; since?: string }>;
}) {
  const params = await searchParams;
  const { product, store, outcome } = params;
  const since: RequestWindow | undefined = isRequestWindow(params.since) ? params.since : undefined;
  const tenantId = store && UUID.test(store) ? store : undefined;
  // A signed-in seller or reseller team gets its own storefront's log from the API (/account/requests), never
  // another's; the platform admin sees every storefront's.
  const [viewer, log] = await Promise.all([
    getViewer(),
    getAdminApi().requests({
      productId: product,
      tenantId,
      outcome: outcomes.has(outcome as RequestOutcome) ? (outcome as RequestOutcome) : undefined,
      from: windowStart(since)
    })
  ]);
  const isAdmin = viewer?.isAdmin ?? false;
  const day = log.last24Hours;
  const storeName = tenantId ? (log.items.find((r) => r.tenantId === tenantId)?.tenantName ?? "this store") : null;
  const kept = isAdmin
    ? `Every storefront call and admin change is kept ${log.retentionDays} days; never bodies or secrets.`
    : `Every call made with your API keys, failed sign-ins included, and every change your team made here. Kept ${log.retentionDays} days; what was sent and secrets are never kept.`;
  const shown = log.items.length < log.total ? ` Showing the newest ${log.items.length} of ${log.total}.` : "";
  const current = { product, store: tenantId, outcome, since };

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Requests"
        description={`${day.total} calls in the last 24 hours, ${day.clientErrors} refused and ${day.serverErrors} failed. ${kept}${shown}`}>
        {storeName && (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefWith(current, { store: undefined })}>All stores</Link>
          </Button>
        )}
      </PageHeader>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Time">
        {([...Object.keys(REQUEST_WINDOWS), undefined] as (RequestWindow | undefined)[]).map((w) => (
          <Button key={w ?? "all"} asChild size="sm" variant={w === since ? "default" : "outline"}>
            <Link href={hrefWith(current, { since: w })} aria-current={w === since ? "true" : undefined}>
              {w ? REQUEST_WINDOWS[w].label : `All ${log.retentionDays} days`}
            </Link>
          </Button>
        ))}
        {storeName && <span className="text-sm">Only calls about {storeName}.</span>}
      </div>
      <RequestsTable requests={log.items} showStorefront={isAdmin} />
    </div>
  );
}
