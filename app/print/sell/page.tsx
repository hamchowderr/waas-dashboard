import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { GROUP_IDS, customerFacingShop, pitch, type GroupId } from "@/lib/sales-kit";
import { loadSalesKit } from "@/lib/sales-kit-files";
import { PrintSheet } from "./print-sheet";

type Search = Promise<{ product?: string; group?: string; kind?: string }>;

/**
 * A printable offer sheet or pitch deck for one customer group, in the storefront's brand, outside the dashboard's
 * frame so the browser's Save as PDF gives a clean file. The Sales Kit page links here.
 */
async function load(searchParams: Search) {
  const { product: productId, group, kind } = await searchParams;
  if (!GROUP_IDS.includes(group as GroupId)) notFound();
  const api = getAdminApi();
  const viewer = await getViewer();
  const products = await api.products();
  const product = products.find((p) => p.id === productId) ?? products.find((p) => p.id === viewer?.active?.productId) ?? products[0];
  if (!product) notFound();
  const [kit, branding, storefront] = await Promise.all([
    loadSalesKit(),
    api.branding(product.id).catch(() => null),
    api.storefront(product.id).catch(() => null)
  ]);
  const playbook = kit.playbooks.find((p) => p.id === group)!;
  return {
    product,
    playbook,
    kind: kind === "deck" ? ("deck" as const) : ("offer" as const),
    brand: branding?.shown.name ?? product.name,
    color: branding?.shown.color ?? null,
    logo: branding?.shown.logoUrl ?? null,
    support: branding?.shown.supportEmail ?? null,
    shop: customerFacingShop(storefront?.domain),
    sender: viewer?.user.name || null
  };
}

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const { brand, playbook, kind } = await load(searchParams);
  // The PDF's file name comes from the title, so it carries the seller's brand only.
  return { title: { absolute: `${brand} ${kind === "deck" ? "pitch deck" : "offer"} for ${playbook.title.toLowerCase()}` } };
}

export default async function PrintSellPage({ searchParams }: { searchParams: Search }) {
  const data = await load(searchParams);
  return (
    <PrintSheet
      kind={data.kind}
      productId={data.product.id}
      group={data.playbook.title}
      plan={data.playbook.plan}
      pitch={pitch(data.playbook)}
      brand={data.brand}
      color={data.color}
      logo={data.logo}
      support={data.support}
      shop={data.shop}
      sender={data.sender}
    />
  );
}
