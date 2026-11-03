import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StoreIcon } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Card } from "@/components/ui/card";
import { loadKitFor, pickProduct } from "./load";
import { SellHome } from "./sell-home";

export const metadata: Metadata = { title: "Sales Kit" };

/** The first sentence of a playbook's Who: the card's one line about the group. */
const firstSentence = (text: string) => /^[^\n]*?[.!?](?=\s|$)/.exec(text.trim())?.[0] ?? text.split("\n")[0]!;

export default async function SellPage({ searchParams }: { searchParams: Promise<{ product?: string; group?: string }> }) {
  const { product: productId, group } = await searchParams;
  const { product, first } = await pickProduct(productId);
  if (group && product) redirect(`/sell/${group}?product=${product.id}`);

  if (!product) {
    if (first) redirect(`/sell?product=${first.id}`);
    return (
      <div className="space-y-4 lg:space-y-6">
        <PageHeader title="Sales Kit" />
        <Card>
          <EmptyState icon={StoreIcon} title="No storefronts yet">
            Playbooks, messages and guides to find and win customers, in your storefront&apos;s own name.
          </EmptyState>
        </Card>
      </div>
    );
  }

  const kit = await loadKitFor(product);
  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Sales Kit"
        description={`Pick who you want to sell to and get a ready-made plan: where to find them, what to send each day and what to charge. Everything goes out under the ${kit.context.brand} name.`}
      />
      <SellHome
        key={product.id}
        productId={product.id}
        groups={kit.playbooks.map((p) => ({ id: p.id, title: p.title, plan: p.plan, finder: p.finder, who: firstSentence(p.sections.find((s) => s.title === "Who")?.body ?? "") }))}
        guides={kit.guides}
        context={kit.context}
      />
    </div>
  );
}
