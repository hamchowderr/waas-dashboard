import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { customerFacingShop } from "@/lib/sales-kit";
import { CheckReport } from "./check-report";

type Search = Promise<{ product?: string; prospect?: string }>;

export const metadata: Metadata = { title: { absolute: "Website check" } };

/** A prospect's website check (from when its website was read) as a printable page in the storefront's brand, for Save as PDF. */
export default async function PrintCheckPage({ searchParams }: { searchParams: Search }) {
  const { product: productId, prospect } = await searchParams;
  if (!prospect) notFound();
  const api = getAdminApi();
  const viewer = await getViewer();
  const products = await api.products();
  const product = products.find((p) => p.id === productId) ?? products.find((p) => p.id === viewer?.active?.productId) ?? products[0];
  if (!product) notFound();
  const [branding, storefront, list] = await Promise.all([
    api.branding(product.id).catch(() => null),
    api.storefront(product.id).catch(() => null),
    api.prospectDemos(product.id).catch(() => null)
  ]);
  const report = list?.prospects.find((p) => p.id === prospect)?.report ?? null;
  const error = report ? null : "This website hasn't been checked yet. Read it from the Sales Kit's Prospects tab first.";

  return (
    <CheckReport
      report={report}
      error={error}
      brand={branding?.shown.name ?? product.name}
      color={branding?.shown.color ?? null}
      logo={branding?.shown.logoUrl ?? null}
      support={branding?.shown.supportEmail ?? null}
      shop={customerFacingShop(storefront?.domain)}
      sender={viewer?.user.name || null}
    />
  );
}
