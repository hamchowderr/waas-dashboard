"use client";

import * as React from "react";

import { SUGGESTED_PRICES, type Plan } from "@/lib/sales-kit";

/** The seller's own monthly prices, kept in this browser per storefront; the suggested ones until set. */
export function useSellPrices(productId: string) {
  const key = `anypress:sell-prices:${productId}`;
  // Saved prices are this browser's; the server renders the suggested ones, and the page fills in saved ones after.
  const saved = React.useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null
  );
  const [edited, setPrices] = React.useState<Record<Plan, number> | null>(null);
  const prices = React.useMemo<Record<Plan, number>>(() => {
    if (edited) return edited;
    try {
      return { ...SUGGESTED_PRICES, ...(JSON.parse(saved ?? "null") as Partial<Record<Plan, number>> | null) };
    } catch {
      return SUGGESTED_PRICES;
    }
  }, [edited, saved]);
  const update = (plan: Plan, value: number) => {
    const next = { ...prices, [plan]: value };
    setPrices(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* kept for this visit only */
    }
  };
  return [prices, update] as const;
}
