import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StoreIcon } from "lucide-react";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Card } from "@/components/ui/card";
import { StorefrontCard } from "../keys/storefront-card";
import { VersionsManager } from "./versions-manager";

export const metadata: Metadata = { title: "Versions & templates" };

export default async function VersionsPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product: productId } = await searchParams;
  const api = getAdminApi();
  const products = await api.products();
  // A customer has one storefront, so their pages open on it.
  const isAdmin = (await getViewer())?.isAdmin === true;
  const onlyOne = !isAdmin && products.length === 1 ? products[0] : undefined;
  const product = products.find((p) => p.id === productId) ?? onlyOne;

  // These pages are about one storefront. With none picked, open the first rather than showing only a picker;
  // the switcher at the top moves between them.
  if (!product) {
    if (products[0]) redirect(`/versions?product=${products[0].id}`);
    return (
      <div className="space-y-4 lg:space-y-6">
        <PageHeader title="Versions & templates" />
        <Card>
          <EmptyState icon={StoreIcon} title="No storefronts yet">
            Each storefront has its own versions and templates. A storefront is set up when a seller or reseller is approved.
          </EmptyState>
        </Card>
      </div>
    );
  }

  const [versions, templates, storefront] = await Promise.all([
    api.versions(product.id),
    api.templates(product.id),
    api.storefront(product.id)
  ]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Versions & templates"
        description={`${product.name}: the WordPress builds its stores run on, and the templates they start from.`}
      />
      <StorefrontCard productId={product.id} productName={product.name} storefront={storefront} canBuild={isAdmin} />
      <VersionsManager productId={product.id} versions={versions} templates={templates} />
    </div>
  );
}
