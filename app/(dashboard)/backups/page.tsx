import type { Metadata } from "next";

import { getAdminApi } from "@/lib/api/client";
import { formatBytes } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { BackupsTable } from "./backups-table";

export const metadata: Metadata = { title: "Backups" };

export default async function BackupsPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  const page = await getAdminApi().backups({ productId: product });
  const totalSize = page.items.reduce((sum, b) => sum + (b.sizeBytes ?? 0), 0);

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Backups"
        description={`${page.total} backups, ${formatBytes(totalSize)}${page.items.length < page.total ? " in the newest " + page.items.length : " in total"}. A deleted store's backups are kept until they expire, for restore.`}
      />
      <BackupsTable backups={page.items} />
    </div>
  );
}
