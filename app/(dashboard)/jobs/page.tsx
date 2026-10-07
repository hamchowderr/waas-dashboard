import type { Metadata } from "next";

import { getAdminApi } from "@/lib/api/client";
import { PageHeader } from "@/components/admin/page-header";
import { JobsTable } from "./jobs-table";

export const metadata: Metadata = { title: "Jobs" };

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
        title="Jobs"
        description={`${page.counts.queued} queued, ${page.counts.running} running, ${page.counts.failed} failed. A job is marked failed after its last retry.${page.truncated ? " Showing the first 2,000 of each." : ""}`}
      />
      <JobsTable jobs={page.items} initialTab={state && tabs.has(state) ? state : "all"} />
    </div>
  );
}
