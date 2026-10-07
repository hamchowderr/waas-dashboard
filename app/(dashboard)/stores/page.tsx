import type { Metadata } from "next";

import { getAdminApi } from "@/lib/api/client";
import { PageHeader } from "@/components/admin/page-header";
import { StoresTable } from "./stores-table";

export const metadata: Metadata = { title: "Stores" };

export default async function StoresPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  const page = await getAdminApi().tenants({ productId: product });

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Stores"
        description={
          page.total > page.items.length
            ? `Showing ${page.items.length} of ${page.total} stores.`
            : `${page.total} stores across ${product ? "this storefront" : "all storefronts"}.`
        }
      />
      <StoresTable tenants={page.items} />
    </div>
  );
}
