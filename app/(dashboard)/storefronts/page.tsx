import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HandshakeIcon, PanelsTopLeftIcon, StoreIcon } from "lucide-react";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatTiles } from "@/components/admin/stat-tile";
import { Card } from "@/components/ui/card";
import { NewSellerButton } from "./new-seller-dialog";
import { StorefrontsTable, type StorefrontRow } from "./storefronts-table";

export const metadata: Metadata = { title: "Storefronts" };

export default async function StorefrontsPage() {
  if (!(await getViewer())?.isAdmin) notFound();
  const api = getAdminApi();
  const [products, setup] = await Promise.all([api.products(), api.setup().catch(() => null)]);
  const shops = await Promise.all(products.map((p) => api.storefront(p.id).catch(() => null)));
  const setupOf = new Map(setup?.storefronts.map((s) => [s.productId, s]));
  const rows: StorefrontRow[] = products.map((p, i) => ({
    id: p.id,
    name: p.name,
    tenantCount: p.tenantCount,
    maxTenants: p.maxTenants,
    resellerId: p.resellerId,
    resellerName: p.resellerName,
    highlevelAgency: p.highlevelAgency,
    domain: shops[i]?.domain ?? null,
    setup: setupOf.get(p.id) ?? null
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
          <EmptyState icon={StoreIcon} title="No storefronts yet" action={<NewSellerButton storefronts={products} />}>
            A storefront is set up when you approve an application or make a seller here.
          </EmptyState>
        </Card>
      ) : (
        <>
          <StatTiles
            label="Storefronts at a glance"
            stats={[
              { label: "Storefronts", value: products.length, icon: StoreIcon },
              { label: "Resellers", value: resellers, icon: HandshakeIcon, href: "/resellers" },
              { label: "Stores", value: stores, icon: PanelsTopLeftIcon, href: "/stores" }
            ]}
          />
          <StorefrontsTable rows={rows} />
        </>
      )}
    </div>
  );
}
