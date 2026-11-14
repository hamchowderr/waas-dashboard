import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { DemoBrand } from "@/lib/api/types";
import { brandColorVars } from "@/lib/branding";
import { prospectDemo } from "@/lib/prospect-demo";
import { BrandMark } from "@/components/shell/brand-mark";
import { DemoGallery, type DemoLook } from "@/components/demo/demo-gallery";
import { ProspectDemo } from "@/components/demo/prospect-demo";

/** The platform's own shop, where "Start your website" goes on its demo page. */
const PLATFORM_SHOP = process.env.DEMO_SHOP_URL || "https://shop.anypress.io";
/** A brand with no colour of its own gets a plain near-black, never the platform's pink. */
const NEUTRAL = "#1b1917";

export function demoMetadata(name: string, iconUrl?: string | null): Metadata {
  return {
    title: { absolute: `Demo websites · ${name}` },
    description: `Live demo websites from ${name}: click around, try the forms and edit them in your browser.`,
    ...(iconUrl ? { icons: { icon: iconUrl } } : {})
  };
}

/** A demo made for one business (?for=<code>): who it's for, and the page to go back to. */
export type ProspectPick = { code: string; company: string; home: string };

/** The demo page in a seller's or reseller's look, or the platform's when `brand` is null. */
export function DemoPage({ brand, demo, prospect }: { brand: DemoBrand | null; demo: string | null; prospect?: ProspectPick | null }) {
  if (!brand) {
    const look: DemoLook = { name: "AnyPress", logoUrl: null, mark: <BrandMark className="size-8" />, shopUrl: PLATFORM_SHOP };
    return <DemoGallery look={look} initialDemo={demo} />;
  }
  const look: DemoLook = { name: brand.name, logoUrl: brand.brand?.logoUrl ?? null, shopUrl: brand.shopUrl };
  return (
    <div style={brandColorVars(brand.brand?.color ?? NEUTRAL) as React.CSSProperties}>
      {prospect ? <ProspectDemo look={look} {...prospect} /> : <DemoGallery look={look} initialDemo={demo} />}
    </div>
  );
}

/** The demo made for one business, when the link carries its code and it's this storefront's own. */
export async function prospectFor(productId: string, code: string | undefined, home: string): Promise<ProspectPick | null> {
  if (!code) return null;
  const demo = await prospectDemo(code);
  if (!demo || demo.productId?.toLowerCase() !== productId.toLowerCase()) notFound();
  return { code, company: demo.company, home };
}
