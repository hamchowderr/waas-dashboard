import type { Metadata } from "next";

import { sellerAddress } from "@/lib/dashboard-host";
import { demoBrand } from "@/lib/demo-brand";
import { DemoPage, demoMetadata, prospectFor } from "./look";

/** On a seller's own dashboard address, the seller's demo page; on the platform's, the platform's. */
async function brandHere() {
  const seller = await sellerAddress();
  return seller?.productId ? demoBrand(seller.productId) : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const brand = await brandHere();
  return demoMetadata(brand?.name ?? "AnyPress", brand?.brand?.iconUrl);
}

export default async function Demo({ searchParams }: { searchParams: Promise<{ d?: string; for?: string }> }) {
  const [{ d, for: code }, brand, seller] = await Promise.all([searchParams, brandHere(), sellerAddress()]);
  const prospect = brand && seller?.productId ? await prospectFor(seller.productId, code, "/demo") : null;
  return <DemoPage brand={brand} demo={d ?? null} prospect={prospect} />;
}
