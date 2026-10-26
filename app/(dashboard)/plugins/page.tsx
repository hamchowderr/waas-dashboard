import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StoreIcon } from "lucide-react";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Card } from "@/components/ui/card";
import { PluginChoicesManager } from "./plugin-choices-manager";

export const metadata: Metadata = { title: "Plugins" };

export default async function PluginsPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product: productId } = await searchParams;
  const api = getAdminApi();
  const products = await api.products();
  // A customer has one storefront, so their pages open on it.
  const onlyOne = !(await getViewer())?.isAdmin && products.length === 1 ? products[0] : undefined;
  const product = products.find((p) => p.id === productId) ?? onlyOne;

  // These pages are about one storefront. With none picked, open the first rather than showing only a picker;
  // the switcher at the top moves between them.
  if (!product) {
    if (products[0]) redirect(`/plugins?product=${products[0].id}`);
    return (
      <div className="space-y-4 lg:space-y-6">
        <PageHeader title="Plugins" />
        <Card>
          <EmptyState icon={StoreIcon} title="No storefronts yet">
            Each storefront has its own plugins. A storefront is set up when a seller or reseller is approved.
          </EmptyState>
        </Card>
      </div>
    );
  }

  const choices = await api.pluginChoices(product.id);

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Plugins"
        description={`${product.name}: plugins from wordpress.org or your own uploads that your stores get on top of the template, and template plugins you switch off.`}
      />
      <PluginChoicesManager productId={product.id} choices={choices} />
    </div>
  );
}
