import type { Metadata } from "next";
import Link from "next/link";

import { getAdminApi } from "@/lib/api/client";
import { PageHeader } from "@/components/admin/page-header";
import { StoresTable } from "./stores-table";
import { MoveSiteIn } from "./move-site-in";
import { NewSite } from "./new-site";
import { canChange, getViewer } from "@/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Stores" };

export default async function StoresPage({ searchParams }: { searchParams: Promise<{ product?: string; state?: string; all?: string }> }) {
  const { product, state, all } = await searchParams;
  const viewer = await getViewer().catch(() => null);
  // A reseller's team can see the stores of all its storefronts in one list, not one storefront at a time.
  const storefronts = viewer && !viewer.isAdmin && viewer.active?.resellerId ? viewer.memberships : [];
  const across = all === "1" && storefronts.length > 1;
  const [page, products] = await Promise.all([
    getAdminApi().tenants({ productId: product, acrossReseller: across }),
    getAdminApi().products()
  ]);
  // On one storefront's list, a new site or one moved in goes to that storefront.
  const choices = (product ? products.filter((p) => p.id === product) : products).map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Stores"
        description={
          page.total > page.items.length
            ? `Showing ${page.items.length} of ${page.total} stores.`
            : `${page.total} ${page.total === 1 ? "store" : "stores"} on ${across ? `your ${storefronts.length} storefronts` : product ? "this storefront" : viewer?.isAdmin ? "all storefronts" : "your storefront"}.`
        }
      >
        {storefronts.length > 1 && (
          <div className="flex gap-1" role="group" aria-label="Which stores">
            <Button asChild size="sm" variant={across ? "outline" : "default"}>
              <Link href="/stores" aria-current={across ? undefined : "true"}>
                {viewer?.active?.productName ?? "This storefront"}
              </Link>
            </Button>
            <Button asChild size="sm" variant={across ? "default" : "outline"}>
              <Link href="/stores?all=1" aria-current={across ? "true" : undefined}>
                All storefronts
              </Link>
            </Button>
          </div>
        )}
        {viewer && canChange(viewer) && !across && (
          <div className="flex gap-2" data-tour-step-id="store-actions">
            <MoveSiteIn products={choices} />
            <NewSite products={choices} />
          </div>
        )}
      </PageHeader>
      <StoresTable
        tenants={page.items}
        initialTab={state}
        storefronts={across ? storefronts.map((m) => ({ ...m, active: m.productId === viewer?.active?.productId })) : undefined}
      />
    </div>
  );
}
