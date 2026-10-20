"use client";

import { DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ResellerBill } from "@/lib/api/types";

const money = (cents: number) => (cents / 100).toFixed(2);

/** One quoted CSV field. */
const field = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

/** The month's bill as a CSV file, to send with the invoice. */
export function BillDownload({ resellerName, bill }: { resellerName: string; bill: ResellerBill }) {
  const download = () => {
    const rows: (string | number)[][] = [
      ["Storefront", "Size", "Store-days", "Stores", "List price (USD)", "Wholesale price (USD)", "Amount (USD)"],
      ...bill.lines.map((l) => [l.name ?? "Deleted storefront", l.size, l.storeDays, l.stores, money(l.listPriceCents), money(l.wholesalePriceCents), money(l.amountCents)]),
      ["Total", "", "", "", "", "", money(bill.totalCents)]
    ];
    const csv = rows.map((row) => row.map(field).join(",")).join("\r\n") + "\r\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${resellerName.replace(/[^\w -]+/g, "").trim() || "Reseller"} bill ${bill.month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button variant="outline" size="sm" onClick={download} disabled={bill.lines.length === 0}>
      <DownloadIcon />
      CSV
    </Button>
  );
}
