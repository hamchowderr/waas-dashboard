import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { customerFacingShop } from "@/lib/sales-kit";
import { CheckError, checkWebsite } from "@/lib/website-check-fetch";
import { CheckReport } from "./check-report";

type Search = Promise<{ product?: string; url?: string }>;

export const metadata: Metadata = { title: { absolute: "Website check" } };

/** A prospect's website check as a printable page in the storefront's brand, for Save as PDF. */
export default async function PrintCheckPage({ searchParams }: { searchParams: Search }) {
  const { product: productId, url } = await searchParams;
  if (!url) notFound();
  const api = getAdminApi();
  const viewer = await getViewer();
  const products = await api.products();
  const product = products.find((p) => p.id === productId) ?? products.find((p) => p.id === viewer?.active?.productId) ?? products[0];
  if (!product) notFound();
  const [branding, storefront] = await Promise.all([api.branding(product.id).catch(() => null), api.storefront(product.id).catch(() => null)]);

  let report = null;
  let error: string | null = null;
  try {
    report = await checkWebsite(url);
  } catch (err) {
    error = err instanceof CheckError ? err.message : "Something went wrong checking that website.";
  }

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
