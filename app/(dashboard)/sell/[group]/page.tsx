import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { GROUP_IDS, campaign, demosFor, pitch, type GroupId } from "@/lib/sales-kit";
import { Button } from "@/components/ui/button";
import { loadKitFor, pickProduct } from "../load";
import { GroupIcon } from "../kit-ui";
import { Campaign } from "./campaign";

type Params = Promise<{ group: string }>;
type Search = Promise<{ product?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { group } = await params;
  return { title: `Sales Kit · ${group.replace(/^./, (c) => c.toUpperCase())}` };
}

export default async function SellGroupPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const [{ group }, { product: productId }] = await Promise.all([params, searchParams]);
  if (!GROUP_IDS.includes(group as GroupId)) notFound();
  const { product, first } = await pickProduct(productId);
  if (!product) {
    if (first) redirect(`/sell/${group}?product=${first.id}`);
    redirect("/sell");
  }
  const kit = await loadKitFor(product);
  const playbook = kit.playbooks.find((p) => p.id === group)!;
  const section = (title: string) => playbook.sections.find((s) => s.title === title)?.body ?? "";
  const callScript = kit.guides.find((g) => g.id === "call-script");

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="icon">
          <Link href={`/sell?product=${encodeURIComponent(product.id)}`}>
            <ChevronLeft />
            <span className="sr-only">Back to the Sales Kit</span>
          </Link>
        </Button>
        <GroupIcon id={playbook.id} className="size-10 max-sm:hidden" />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight lg:text-2xl">{playbook.title}</h1>
          <p className="text-muted-foreground truncate text-sm">A 32-day plan to win them, under the {kit.context.brand} name</p>
        </div>
      </div>
      <Campaign
        productId={product.id}
        playbook={playbook}
        steps={campaign(playbook)}
        pitch={pitch(playbook)}
        who={section("Who")}
        where={section("Where to find them")}
        objections={section("Objections")}
        demo={section("Demo")}
        demos={demosFor(playbook.id)}
        callScript={callScript?.body ?? ""}
        context={kit.context}
        wholesalePercent={kit.wholesalePercent}
      />
    </div>
  );
}
