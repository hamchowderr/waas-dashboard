import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import type { StoreSize } from "@/lib/api/types";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KeysManager } from "../../keys/keys-manager";
import { formatDays, formatMoney, monthRange } from "../usage";
import { BillDownload } from "./bill-download";
import { DeleteReseller } from "./delete-reseller";
import { ResellerSettingsForm } from "./settings-form";
import { ResellerStorefronts } from "./storefronts";

export const metadata: Metadata = { title: "Reseller" };

const SIZE_LABELS: Record<StoreSize, string> = { small: "Small", medium: "Medium", large: "Large" };

export default async function ResellerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ month?: string }> }) {
  if (!(await getViewer())?.isAdmin) notFound();
  const { id } = await params;
  const api = getAdminApi();
  const reseller = /^[0-9a-f-]{36}$/i.test(id) ? await api.reseller(id) : null;
  if (!reseller) notFound();
  const month = monthRange((await searchParams).month);
  const [bill, products, keys] = await Promise.all([api.resellerBill(reseller.id, month.month), api.products(), api.partnerKeys(reseller.id)]);
  const current = monthRange(undefined).month;

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader title={reseller.name} description={`${reseller.liveTenantCount} live of ${reseller.tenantCount} stores across ${reseller.products.length} storefront${reseller.products.length === 1 ? "" : "s"}.`}>
        <div className="flex items-center gap-2">
          {reseller.products.length === 0 && <DeleteReseller id={reseller.id} name={reseller.name} />}
          <Button asChild variant="outline" size="sm">
            <Link href="/resellers">All resellers</Link>
          </Button>
        </div>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="space-y-1.5">
              <CardTitle>
                Bill for {month.label}
                {!bill.complete && <span className="text-muted-foreground font-normal"> (so far)</span>}
              </CardTitle>
              <CardDescription>
                Each store pays its size&apos;s list price less {bill.wholesalePercent}%, for the days it was live. Suspended stores don&apos;t
                count.{bill.billingEmail && <> Send it to {bill.billingEmail}.</>}
              </CardDescription>
            </div>
            <div className="flex gap-1">
              <BillDownload resellerName={reseller.name} bill={bill} />
              <Button asChild variant="outline" size="icon" aria-label="Previous month">
                <Link href={`/resellers/${reseller.id}?month=${month.previous}`}>
                  <ChevronLeftIcon />
                </Link>
              </Button>
              {month.month < current && (
                <Button asChild variant="outline" size="icon" aria-label="Next month">
                  <Link href={`/resellers/${reseller.id}?month=${month.next}`}>
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
        <Card>
          <CardHeader>
            <CardTitle>Storefronts</CardTitle>
            <CardDescription>Each keeps its keys, team and stores. Its live stores count toward this bill.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResellerStorefronts
              id={reseller.id}
              name={reseller.name}
              storefronts={reseller.products}
              available={products.filter((p) => !p.resellerId).map(({ id, name }) => ({ id, name }))}
            />
          </CardContent>
        </Card>
        <div className="lg:col-span-3">
          <KeysManager partner productId={reseller.id} productName={reseller.name} keys={keys} />
        </div>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <ResellerSettingsForm id={reseller.id} settings={reseller} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
