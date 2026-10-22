import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StoreIcon } from "lucide-react";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Card } from "@/components/ui/card";
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

  // These pages are about one storefront. With none picked, open the first rather than showing only a picker;
  // the switcher at the top moves between them.
  if (!product) {
    if (products[0]) redirect(`/team?product=${products[0].id}`);
    return (
      <div className="space-y-4 lg:space-y-6">
        <PageHeader title="Team" />
        <Card>
          <EmptyState icon={StoreIcon} title="No storefronts yet">
            Who can sign in to each storefront. A storefront is set up when a seller or reseller is approved.
          </EmptyState>
        </Card>
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
