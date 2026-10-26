import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import type { ResellerBill, ResellerInvoice, ResellerInvoices, StoreSize } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDays, formatMoney, monthRange } from "./usage";
import { BillDownload } from "./[id]/bill-download";

const SIZE_LABELS: Record<StoreSize, string> = { small: "Small", medium: "Medium", large: "Large" };

const INVOICE_STATUS: Record<ResellerInvoice["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sending: { label: "Sending", variant: "secondary" },
  nothing_due: { label: "Nothing due", variant: "outline" },
  open: { label: "Waiting for payment", variant: "secondary" },
  paid: { label: "Paid", variant: "default" },
  void: { label: "Voided", variant: "outline" },
  uncollectible: { label: "Uncollectible", variant: "destructive" },
  failed: { label: "Not sent", variant: "destructive" }
};

type Month = ReturnType<typeof monthRange>;

/**
 * A reseller's bill for one month, with the month before and after. The platform admin's reseller page and a
 * reseller team's own Reseller page both show it. monthHref: the page's address for another month.
 */
export function BillCard({
  bill,
  month,
  current,
  resellerName,
  autoSend,
  monthHref
}: {
  bill: ResellerBill;
  month: Month;
  /** This calendar month (YYYY-MM): no link past it. */
  current: string;
  resellerName: string;
  autoSend: boolean;
  monthHref: (month: string) => string;
}) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="space-y-1.5">
          <CardTitle>
            Bill for {month.label}
            {!bill.complete && <span className="text-muted-foreground font-normal"> (so far)</span>}
          </CardTitle>
          <CardDescription>
            Each store pays its size&apos;s list price less {bill.wholesalePercent}%, for the days it was live. Suspended stores don&apos;t
            count.{" "}
            {autoSend ? (
              <>Stripe sends it on the 1st{bill.billingEmail && <> to {bill.billingEmail}</>}, charging the card on file when there is one.</>
            ) : (
              bill.billingEmail && <>Send it to {bill.billingEmail}.</>
            )}
          </CardDescription>
        </div>
        <div className="flex gap-1">
          <BillDownload resellerName={resellerName} bill={bill} />
          <Button asChild variant="outline" size="icon" aria-label="Previous month">
            <Link href={monthHref(month.previous)}>
              <ChevronLeftIcon />
            </Link>
          </Button>
          {month.month < current && (
            <Button asChild variant="outline" size="icon" aria-label="Next month">
              <Link href={monthHref(month.next)}>
                <ChevronRightIcon />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Storefront</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="text-right">Store-days</TableHead>
              <TableHead className="text-right">Price each</TableHead>
              <TableHead className="pr-6 text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bill.lines.map((l) => (
              <TableRow key={`${l.productId}-${l.size}`}>
                <TableCell className="pl-6">{l.name ?? <span className="text-muted-foreground">Deleted storefront</span>}</TableCell>
                <TableCell>{SIZE_LABELS[l.size]}</TableCell>
                <TableCell className="text-right tabular-nums">{formatDays(l.storeDays)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(l.wholesalePriceCents)}
                  <span className="text-muted-foreground"> of {formatMoney(l.listPriceCents)}</span>
                </TableCell>
                <TableCell className="pr-6 text-right tabular-nums">{formatMoney(l.amountCents)}</TableCell>
              </TableRow>
            ))}
            {bill.lines.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                  No live stores this month.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {bill.lines.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell className="pl-6 font-medium" colSpan={4}>
                  Total
                </TableCell>
                <TableCell className="pr-6 text-right font-medium tabular-nums">{formatMoney(bill.totalCents)}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </CardContent>
    </Card>
  );
}

/** The Stripe invoices sent for a reseller's bills. action: the admin's Send button, when there is one. */
export function InvoicesCard({
  invoicing,
  description,
  action,
  monthHref
}: {
  invoicing: ResellerInvoices;
  description: React.ReactNode;
  action?: React.ReactNode;
  monthHref: (month: string) => string;
}) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="space-y-1.5">
          <CardTitle>Invoices</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {action}
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Month</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="pr-6 text-right">Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoicing.invoices.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="pl-6">
                  <Link href={monthHref(i.month)} className="hover:underline">
                    {monthRange(i.month).label}
                  </Link>
                  {i.error && <p className="text-destructive max-w-md text-sm whitespace-normal">{i.error}</p>}
                </TableCell>
                <TableCell>
                  <Badge variant={INVOICE_STATUS[i.status].variant}>{INVOICE_STATUS[i.status].label}</Badge>
                  {i.status === "open" && (
                    <span className="text-muted-foreground block text-xs">{i.chargeAutomatically ? "Charging the card on file" : "Emailed to pay"}</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(i.totalCents)}</TableCell>
                <TableCell className="pr-6 text-right">
                  {i.hostedInvoiceUrl ? (
                    <a href={i.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      View
                    </a>
                  ) : (
                    <span className="text-muted-foreground">{formatDate(i.dateUpdated)}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {invoicing.invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                  No invoices yet. The first goes out on the 1st after a month with live stores.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
