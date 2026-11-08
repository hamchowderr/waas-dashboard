import type { Metadata } from "next";

import { sellerAddress } from "@/lib/dashboard-host";
import { demoBrand } from "@/lib/demo-brand";
import { DemoPage, demoMetadata } from "./look";

/** On a seller's own dashboard address, the seller's demo page; on the platform's, the platform's. */
async function brandHere() {
  const seller = await sellerAddress();
  return seller?.productId ? demoBrand(seller.productId) : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const brand = await brandHere();
  return demoMetadata(brand?.name ?? "AnyPress", brand?.brand?.iconUrl);
}

export default async function Demo({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const [{ d }, brand] = await Promise.all([searchParams, brandHere()]);
  return <DemoPage brand={brand} demo={d ?? null} />;
}
