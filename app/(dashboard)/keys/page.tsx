import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StoreIcon } from "lucide-react";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Card } from "@/components/ui/card";
import { KeysManager } from "./keys-manager";
import { NewSellerButton } from "./new-seller-dialog";

export const metadata: Metadata = { title: "API keys" };

export default async function KeysPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
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
    if (products[0]) redirect(`/keys?product=${products[0].id}`);
    return (
      <div className="space-y-4 lg:space-y-6">
        <PageHeader title="API keys">{isAdmin && <NewSellerButton storefronts={products} />}</PageHeader>
        <Card>
          <EmptyState icon={StoreIcon} title="No storefronts yet">
            Each storefront signs in to the API with its own keys. A storefront is set up when a seller or reseller is approved.
          </EmptyState>
        </Card>
      </div>
    );
  }

  const keys = await api.apiKeys(product.id);

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="API keys"
        description={`${product.name}: the keys its storefront and integrations sign in to the API with.`}>
        {isAdmin && <NewSellerButton storefronts={products} />}
      </PageHeader>
      <KeysManager
        productId={product.id}
        productName={product.name}
        keys={keys}
      />
    </div>
  );
}
