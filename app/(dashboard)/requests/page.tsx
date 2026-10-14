import type { Metadata } from "next";
import Link from "next/link";

import { getAdminApi } from "@/lib/api/client";
import type { RequestOutcome } from "@/lib/api/types";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { RequestsTable } from "./requests-table";

export const metadata: Metadata = { title: "Requests" };

const outcomes = new Set<RequestOutcome>(["ok", "client-error", "server-error", "error"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RequestsPage({
  searchParams
}: {
  searchParams: Promise<{ product?: string; store?: string; outcome?: string }>;
}) {
  const { product, store, outcome } = await searchParams;
  const tenantId = store && UUID.test(store) ? store : undefined;
  const log = await getAdminApi().requests({
    productId: product,
    tenantId,
    outcome: outcomes.has(outcome as RequestOutcome) ? (outcome as RequestOutcome) : undefined
  });
  const day = log.last24Hours;
  const storeName = tenantId ? (log.items.find((r) => r.tenantId === tenantId)?.tenantName ?? "this store") : null;

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Requests"
        description={`${day.total} calls in the last 24 hours, ${day.clientErrors} refused and ${day.serverErrors} failed. Every storefront call and admin change is kept ${log.retentionDays} days; never bodies or secrets.${log.items.length < log.total ? ` Showing the newest ${log.items.length} of ${log.total}.` : ""}`}>
        {storeName && (
          <Button asChild variant="outline" size="sm">
            <Link href="/requests">All stores</Link>
          </Button>
        )}
      </PageHeader>
      {storeName && <p className="text-sm">Only calls about {storeName}.</p>}
      <RequestsTable requests={log.items} />
    </div>
  );
}
