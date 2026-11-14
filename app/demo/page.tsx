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

/** The demo made for one business, on a seller's own address only (the platform's list opens on anypress.io). */
async function prospectHere(hasBrand: boolean, productId: string | null | undefined, code: string | undefined) {
  return hasBrand && productId ? prospectFor(productId, code, "/demo") : null;
}

export default async function Demo({ searchParams }: { searchParams: Promise<{ d?: string; for?: string }> }) {
  const [{ d, for: code }, brand, seller] = await Promise.all([searchParams, brandHere(), sellerAddress()]);
  const prospect = await prospectHere(Boolean(brand), seller?.productId, code);
  return <DemoPage brand={brand} demo={d ?? null} prospect={prospect} />;
}
