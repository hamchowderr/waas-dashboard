import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, StoreIcon } from "lucide-react";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TeamManager } from "./team-manager";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product: productId } = await searchParams;
  const api = getAdminApi();
  const viewer = await getViewer();
  const products = await api.products();
  // A customer has one storefront, so the page opens on it.
  const onlyOne = !viewer?.isAdmin && products.length === 1 ? products[0] : undefined;
  const product = products.find((p) => p.id === productId) ?? onlyOne;

  // A team belongs to one storefront: pick one first.
  if (!product) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <PageHeader
          title="Team"
          description="Who can sign in to each storefront. Choose a storefront to invite its people."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className="hover:bg-muted/40 relative transition-colors">
              <CardContent className="flex items-center gap-3">
                <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md border">
                  <StoreIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/team?product=${p.id}`} className="font-medium focus:outline-none">
                    <span className="absolute inset-0" aria-hidden={true} />
                    {p.name}
                  </Link>
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

  const team = await api.team(product.id);
  // The platform admin may do anything; a customer acts with their own role.
  const myRole = viewer?.isAdmin ? null : (viewer?.active?.role ?? "member");

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Team"
        description={`${product.name}: who can sign in to this dashboard and what they can do.`}
      />
      <TeamManager
        productId={product.id}
        productName={product.name}
        team={team}
        me={{ userId: viewer?.user.id ?? "", role: myRole }}
      />
    </div>
  );
}
