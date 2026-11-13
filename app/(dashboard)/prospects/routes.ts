import type { ProspectRoute } from "@/lib/api/types";

/** How a prospect would use AnyPress; the demo's "made for you" bar says the same. */
export const ROUTE_LABELS: Record<ProspectRoute, string> = {
  owner: "Own website",
  seller: "Seller",
  reseller: "Reseller",
  affiliate: "Affiliate",
  chamber: "Chamber"
};
