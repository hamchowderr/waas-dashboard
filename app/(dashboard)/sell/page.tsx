import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StoreIcon } from "lucide-react";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { loadSalesKit } from "@/lib/sales-kit-files";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Card } from "@/components/ui/card";
import { SalesKit } from "./sales-kit";

export const metadata: Metadata = { title: "Sales Kit" };

export default async function SellPage({ searchParams }: { searchParams: Promise<{ product?: string; group?: string }> }) {
  const { product: productId, group } = await searchParams;
  const api = getAdminApi();
  const viewer = await getViewer();
  const products = await api.products();
  const active = !viewer?.isAdmin ? products.find((p) => p.id === viewer?.active?.productId) : undefined;
  const product = products.find((p) => p.id === productId) ?? active ?? (!viewer?.isAdmin && products.length === 1 ? products[0] : undefined);

  if (!product) {
    if (products[0]) redirect(`/sell?product=${products[0].id}`);
    return (
      <div className="space-y-4 lg:space-y-6">
        <PageHeader title="Sales Kit" />
        <Card>
          <EmptyState icon={StoreIcon} title="No storefronts yet">
            Playbooks, messages and guides to find and win customers, in your storefront&apos;s own name.
          </EmptyState>
        </Card>
      </div>
    );
  }

  const [kit, branding, storefront] = await Promise.all([
    loadSalesKit(),
    api.branding(product.id).catch(() => null),
    api.storefront(product.id).catch(() => null)
  ]);
  const brand = branding?.shown.name ?? product.name;

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Sales Kit"
        description={`Where to find customers, what to say and what to charge, all under the ${brand} name. Your customers never see who runs the sites.`}
      />
      <SalesKit
        key={product.id}
        productId={product.id}
        playbooks={kit.playbooks}
        guides={kit.guides}
        initialGroup={group}
        context={{
          brand,
          shop: storefront?.domain ? `https://${storefront.domain}` : null,
          sender: viewer?.user.name || null,
          support: branding?.shown.supportEmail ?? null,
          demo: null
        }}
      />
    </div>
  );
}
