import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShoppingBagIcon } from "lucide-react";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { NewSellerButton } from "./new-seller-dialog";
import { StorefrontsTable, type StorefrontRow } from "./storefronts-table";

export const metadata: Metadata = { title: "Storefronts" };

export default async function StorefrontsPage() {
  if (!(await getViewer())?.isAdmin) notFound();
  const api = getAdminApi();
  const products = await api.products();
  const shops = await Promise.all(products.map((p) => api.storefront(p.id).catch(() => null)));
  const rows: StorefrontRow[] = products.map((p, i) => ({
    id: p.id,
    name: p.name,
    tenantCount: p.tenantCount,
    maxTenants: p.maxTenants,
    resellerId: p.resellerId,
    resellerName: p.resellerName,
    domain: shops[i]?.domain ?? null
  }));
  const stores = products.reduce((sum, p) => sum + p.tenantCount, 0);
  const resellers = new Set(products.map((p) => p.resellerId).filter(Boolean)).size;

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Storefronts"
        description="Every shop that sells AnyPress websites. A seller has one storefront; a reseller can have several.">
        <NewSellerButton storefronts={products} />
      </PageHeader>
      {products.length === 0 ? (
        <Card>
          <EmptyState icon={ShoppingBagIcon} title="No storefronts yet" action={<NewSellerButton storefronts={products} />}>
            A storefront is set up when you approve an application or make a seller here.
          </EmptyState>
        </Card>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-3 lg:gap-4">
            <Stat label="Storefronts" value={products.length} />
            <Stat label="Resellers" value={resellers} />
            <Stat label="Stores" value={stores} />
          </dl>
          <StorefrontsTable rows={rows} />
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="gap-1 px-(--card-spacing) py-4">
      <dt className="text-muted-foreground text-xs font-medium sm:text-sm">{label}</dt>
      <dd className="text-2xl font-bold tabular-nums">{value}</dd>
    </Card>
  );
}
