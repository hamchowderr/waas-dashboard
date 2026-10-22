import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StoreIcon } from "lucide-react";

import { canChange, getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Card } from "@/components/ui/card";
import { BrandingEditor } from "./branding-editor";
import { DashboardAddress } from "./dashboard-address";

export const metadata: Metadata = { title: "Branding" };

export default async function BrandingPage({
  searchParams
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product: productId } = await searchParams;
  const api = getAdminApi();
  const viewer = await getViewer();
  const products = await api.products();
  // A customer acts for one storefront at a time, so the page opens on it.
  const active = !viewer?.isAdmin ? products.find((p) => p.id === viewer?.active?.productId) : undefined;
  const onlyOne = !viewer?.isAdmin && products.length === 1 ? products[0] : undefined;
  const product = products.find((p) => p.id === productId) ?? active ?? onlyOne;

  // These pages are about one storefront. With none picked, open the first rather than showing only a picker;
  // the switcher at the top moves between them.
  if (!product) {
    if (products[0]) redirect(`/branding?product=${products[0].id}`);
    return (
      <div className="space-y-4 lg:space-y-6">
        <PageHeader title="Branding" />
        <Card>
          <EmptyState icon={StoreIcon} title="No storefronts yet">
            Each storefront&apos;s name, logo and color in this dashboard. A storefront is set up when a seller or reseller is approved.
          </EmptyState>
        </Card>
      </div>
    );
  }

  // An API without own addresses yet answers 404: leave the card out.
  const [branding, address] = await Promise.all([api.branding(product.id), api.dashboardDomain(product.id).catch(() => null)]);
  const canEdit = !!viewer && canChange(viewer);

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Branding"
        description={`${product.name}: the name, logo and color your team sees when they sign in to this dashboard.`}
      />
      <BrandingEditor
        key={product.id}
        of={product.id}
        initial={branding}
        canEdit={canEdit}
        inherits={product.resellerId ? (product.resellerName ?? "your reseller account") : undefined}
      />
      {address?.enabled && <DashboardAddress key={`address-${product.id}`} productId={product.id} initial={address} canEdit={canEdit} />}
    </div>
  );
}
