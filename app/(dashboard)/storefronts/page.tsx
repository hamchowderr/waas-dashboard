import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLinkIcon, ShoppingBagIcon } from "lucide-react";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { NewSellerButton } from "./new-seller-dialog";
import { RenameStorefrontButton } from "./rename-storefront-dialog";
import { DeleteStorefrontButton } from "./delete-storefront-dialog";
import { StoreLimitButton } from "./store-limit-dialog";

export const metadata: Metadata = { title: "Storefronts" };

/** A storefront's own pages, each opened on it. */
const PAGES = [
  { title: "Stores", href: "/stores" },
  { title: "Versions", href: "/versions" },
  { title: "Plugins", href: "/plugins" },
  { title: "Team", href: "/team" },
  { title: "Branding", href: "/branding" },
  { title: "API keys", href: "/keys" }
];

export default async function StorefrontsPage() {
  if (!(await getViewer())?.isAdmin) notFound();
  const api = getAdminApi();
  // An API without clients yet answers 404: none of these storefronts is a client's.
  const [products, clients] = await Promise.all([api.products(), api.clients().catch(() => [])]);
  const shops = await Promise.all(products.map((p) => api.storefront(p.id).catch(() => null)));
  const clientOf = new Set(clients.map((c) => c.productId));

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Storefronts"
        description="Every account that sells stores, each with its own stores, plugins, team, branding and API keys. Sellers have one storefront; a reseller can have several.">
        <NewSellerButton storefronts={products} />
      </PageHeader>
      {products.length === 0 ? (
        <Card>
          <EmptyState icon={ShoppingBagIcon} title="No storefronts yet" action={<NewSellerButton storefronts={products} />}>
            A storefront is set up when you approve an application, add a client, or make a seller here.
          </EmptyState>
        </Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {products.map((p, i) => {
            const shop = shops[i];
            const q = `?product=${encodeURIComponent(p.id)}`;
            return (
              <li key={p.id}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>
                      <Link href={`/stores${q}`} className="hover:underline">
                        {p.name}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      {p.tenantCount} {p.tenantCount === 1 ? "store" : "stores"}
                      {p.maxTenants !== null && ` of ${p.maxTenants} allowed`}
                    </CardDescription>
                    <CardAction>
                      {p.resellerId ? (
                        <Badge variant="outline" asChild>
                          <Link href={`/resellers/${p.resellerId}`}>Reseller: {p.resellerName ?? "unnamed"}</Link>
                        </Badge>
                      ) : clientOf.has(p.id) ? (
                        <Badge variant="outline">Client</Badge>
                      ) : (
                        <Badge variant="outline">Seller</Badge>
                      )}
                    </CardAction>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="text-muted-foreground">
                      {shop ? (
                        <a
                          href={`https://${shop.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-foreground inline-flex items-center gap-1 hover:underline">
                          {shop.domain}
                          <ExternalLinkIcon className="size-3.5" aria-hidden />
                        </a>
                      ) : (
                        "Sells from its own site, with its API keys."
                      )}
                    </p>
                    <nav aria-label={`${p.name} pages`} className="flex flex-wrap gap-x-4 gap-y-1">
                      {PAGES.map((page) => (
                        <Link key={page.href} href={`${page.href}${q}`} className="text-primary font-medium underline-offset-4 hover:underline">
                          {page.title}
                        </Link>
                      ))}
                    </nav>
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2">
                    <RenameStorefrontButton key={`name-${p.id}`} productId={p.id} name={p.name} />
                    <StoreLimitButton key={`limit-${p.id}`} productId={p.id} maxTenants={p.maxTenants} tenantCount={p.tenantCount} />
                    {p.tenantCount === 0 && <DeleteStorefrontButton productId={p.id} name={p.name} />}
                  </CardFooter>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
