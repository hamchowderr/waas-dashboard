import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, StoreIcon } from "lucide-react";

import { canChange, getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
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

  if (!product) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <PageHeader
          title="Branding"
          description="Each storefront's name, logo and color in this dashboard. Choose a storefront."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className="hover:bg-muted/40 relative transition-colors">
              <CardContent className="flex items-center gap-3">
                <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md border">
                  <StoreIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/branding?product=${p.id}`} className="font-medium focus:outline-none">
                    <span className="absolute inset-0" aria-hidden={true} />
                    {p.name}
                  </Link>
                  {p.resellerName && <p className="text-muted-foreground truncate text-xs">{p.resellerName}</p>}
                </div>
                <ChevronRight className="text-muted-foreground size-5" />
              </CardContent>
            </Card>
          ))}
          {products.length === 0 && <p className="text-muted-foreground text-sm">No storefronts yet.</p>}
        </div>
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
