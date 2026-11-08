import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { demoBrand } from "@/lib/demo-brand";
import { DemoPage, demoMetadata } from "../look";

/** A seller's (storefront id) or reseller's (reseller id) demo page, in their look: the link they send prospects. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const brand = await demoBrand((await params).id);
  return brand ? demoMetadata(brand.name, brand.brand?.iconUrl) : { title: "Not found" };
}

export default async function BrandDemo({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ d?: string }> }) {
  const [{ id }, { d }] = await Promise.all([params, searchParams]);
  const brand = await demoBrand(id);
  if (!brand) notFound();
  return <DemoPage brand={brand} demo={d ?? null} />;
}
