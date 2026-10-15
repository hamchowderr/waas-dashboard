import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, StoreIcon } from "lucide-react";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { VersionsManager } from "./versions-manager";

export const metadata: Metadata = { title: "Versions & templates" };

export default async function VersionsPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product: productId } = await searchParams;
  const api = getAdminApi();
  const products = await api.products();
  // A customer has one storefront, so their pages open on it.
  const onlyOne = !(await getViewer())?.isAdmin && products.length === 1 ? products[0] : undefined;
  const product = products.find((p) => p.id === productId) ?? onlyOne;

  // Versions and templates belong to one storefront: pick one first.
  if (!product) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <PageHeader
          title="Versions & templates"
          description="Each storefront has its own versions and templates. Choose a storefront."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className="hover:bg-muted/40 relative transition-colors">
              <CardContent className="flex items-center gap-3">
                <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md border">
                  <StoreIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/versions?product=${p.id}`} className="font-medium focus:outline-none">
                    <span className="absolute inset-0" aria-hidden={true} />
                    {p.name}
                  </Link>
                  <p className="text-muted-foreground text-sm">
                    {p.versionCount} {p.versionCount === 1 ? "version" : "versions"} · {p.tenantCount}{" "}
                    {p.tenantCount === 1 ? "store" : "stores"}
                  </p>
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

  const [versions, templates] = await Promise.all([api.versions(product.id), api.templates(product.id)]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Versions & templates"
        description={`${product.name}: the WordPress builds its stores run on, and the templates they start from.`}
      />
      <VersionsManager productId={product.id} versions={versions} templates={templates} />
    </div>
  );
}
