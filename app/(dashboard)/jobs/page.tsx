import type { Metadata } from "next";

import { getAdminApi } from "@/lib/api/client";
import { PageHeader } from "@/components/admin/page-header";
import { JobsTable } from "./jobs-table";

export const metadata: Metadata = { title: "Activity" };

const tabs = new Set(["queued", "running", "failed"]);

export default async function JobsPage({
  searchParams
}: {
  searchParams: Promise<{ product?: string; state?: string }>;
}) {
  const { product, state } = await searchParams;
  const page = await getAdminApi().jobs({ productId: product });

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Activity"
        description={`Work the platform is doing on your stores: building, backups, domains and updates. ${page.counts.queued} waiting, ${page.counts.running} running, ${page.counts.failed} failed. A task is marked failed after its last retry.${page.truncated ? " Showing the first 2,000 of each." : ""}`}
      />
      <JobsTable jobs={page.items} initialTab={state && tabs.has(state) ? state : "all"} />
    </div>
  );
}
