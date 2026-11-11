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
import { CleanDashboardCard } from "./clean-dashboard-card";
import { DemoPageCard } from "./demo-page-card";
import { PageTabs } from "@/components/admin/page-tabs";
import { TabsContent } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Branding" };

export default async function BrandingPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; tab?: string }>;
}) {
  const { product: productId, tab } = await searchParams;
  const api = getAdminApi();
  const viewer = await getViewer();
  const products = await api.products();
  // A customer acts for one storefront at a time, so the page opens on it.
  const active = !viewer?.isAdmin
    ? products.find((p) => p.id === viewer?.active?.productId)
    : undefined;
  const onlyOne =
    !viewer?.isAdmin && products.length === 1 ? products[0] : undefined;
  const product = products.find((p) => p.id === productId) ?? active ?? onlyOne;

  // These pages are about one storefront. With none picked, open the first rather than showing only a picker;
  // the switcher at the top moves between them.
  if (!product) {
    if (products[0]) redirect(`/branding?product=${products[0].id}${tab ? `&tab=${encodeURIComponent(tab)}` : ""}`);
    return (
      <div className="space-y-4 lg:space-y-6">
        <PageHeader title="Branding" />
        <Card>
          <EmptyState icon={StoreIcon} title="No storefronts yet">
            Each storefront&apos;s name, logo and color in this dashboard. A
            storefront is set up when a seller or reseller is approved.
          </EmptyState>
        </Card>
      </div>
    );
  }

  // An API without own addresses yet answers 404: leave the card out.
  const [branding, address] = await Promise.all([
    api.branding(product.id),
    api.dashboardDomain(product.id).catch(() => null),
  ]);
  const canEdit = !!viewer && canChange(viewer);

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Branding"
        description={`${product.name}: the name, logo and color your team sees in this dashboard, and that prospects see on your demo page.`}
      />
      {/* Tabs, so each part fits on one screen: the brand itself, then where and how the team sees it. */}
      <PageTabs
        label="Branding"
        initial={tab}
        tabs={[
          { value: "brand", label: "Name, logo and color" },
          { value: "dashboard", label: "Your dashboard" },
          { value: "demo", label: "Demo page" },
        ]}
      >
        <TabsContent value="brand">
          <BrandingEditor
            key={product.id}
            of={product.id}
            initial={branding}
            canEdit={canEdit}
            inherits={
              product.resellerId
                ? (product.resellerName ?? "your reseller account")
                : undefined
            }
          />
        </TabsContent>
        <TabsContent value="dashboard" className="flex flex-col gap-4 lg:gap-6">
          {address?.enabled && (
            <DashboardAddress
              key={`address-${product.id}`}
              productId={product.id}
              initial={address}
              canEdit={canEdit}
            />
          )}
          <CleanDashboardCard
            key={`dashboard-${product.id}`}
            productId={product.id}
            initial={product.cleanDashboard}
            canEdit={canEdit}
          />
        </TabsContent>
        <TabsContent value="demo">
          <DemoPageCard id={product.id} whose="your" />
        </TabsContent>
      </PageTabs>
    </div>
  );
}
