import type { Metadata } from "next";

import { getAdminApi } from "@/lib/api/client";
import { PageHeader } from "@/components/admin/page-header";
import { StoresTable } from "./stores-table";
import { MoveSiteIn } from "./move-site-in";
import { canChange, getViewer } from "@/auth";

export const metadata: Metadata = { title: "Stores" };

export default async function StoresPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  const [page, products, viewer] = await Promise.all([
    getAdminApi().tenants({ productId: product }),
    getAdminApi().products(),
    getViewer().catch(() => null)
  ]);
  // On one storefront's list, a site moved in goes to that storefront.
  const choices = (product ? products.filter((p) => p.id === product) : products).map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Stores"
        description={
          page.total > page.items.length
            ? `Showing ${page.items.length} of ${page.total} stores.`
            : `${page.total} stores across ${product ? "this storefront" : "all storefronts"}.`
        }
      >
        {viewer && canChange(viewer) && <MoveSiteIn products={choices} />}
      </PageHeader>
      <StoresTable tenants={page.items} />
    </div>
  );
}
