import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, StoreIcon } from "lucide-react";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { KeysManager } from "./keys-manager";
import { NewSellerButton } from "./new-seller-dialog";
import { StorefrontCard } from "./storefront-card";

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

  // Keys belong to one storefront: pick one first, or set up a new seller.
  if (!product) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <PageHeader
          title="API keys"
          description="Each storefront signs in to the API with its own keys. Choose a storefront, or set up a new seller."
        >
          <NewSellerButton storefronts={products} />
        </PageHeader>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <Card
              key={p.id}
              className="hover:bg-muted/40 relative transition-colors"
            >
              <CardContent className="flex items-center gap-3">
                <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md border">
                  <StoreIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/keys?product=${p.id}`}
                    className="font-medium focus:outline-none"
                  >
                    <span className="absolute inset-0" aria-hidden={true} />
                    {p.name}
                  </Link>
                  <p className="text-muted-foreground text-sm">
                    {p.tenantCount} {p.tenantCount === 1 ? "store" : "stores"}
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground size-5" />
              </CardContent>
            </Card>
          ))}
          {products.length === 0 && (
            <p className="text-muted-foreground text-sm">No storefronts yet.</p>
          )}
        </div>
      </div>
    );
  }

  const [keys, storefront] = await Promise.all([api.apiKeys(product.id), api.storefront(product.id)]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="API keys"
        description={`${product.name}: the keys its storefront and integrations sign in to the API with.`}
      />
      <StorefrontCard
        productId={product.id}
        productName={product.name}
        storefront={storefront}
        canBuild={isAdmin}
      />
      <KeysManager
        productId={product.id}
        productName={product.name}
        keys={keys}
      />
    </div>
  );
}
