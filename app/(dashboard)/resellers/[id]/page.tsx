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
import { formatDays, monthRange, totalDays } from "../usage";
import { DeleteReseller } from "./delete-reseller";
import { ResellerSettingsForm } from "./settings-form";
import { ResellerStorefronts } from "./storefronts";

export const metadata: Metadata = { title: "Reseller" };

const SIZES: { size: StoreSize; label: string }[] = [
  { size: "small", label: "Small" },
  { size: "medium", label: "Medium" },
  { size: "large", label: "Large" }
];

export default async function ResellerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ month?: string }> }) {
  if (!(await getViewer())?.isAdmin) notFound();
  const { id } = await params;
  const api = getAdminApi();
  const reseller = /^[0-9a-f-]{36}$/i.test(id) ? await api.reseller(id) : null;
  if (!reseller) notFound();
  const month = monthRange((await searchParams).month);
  const [usage, products] = await Promise.all([api.resellerUsage(reseller.id, month.from, month.to), api.products()]);
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
              <CardTitle>Usage in {month.label}</CardTitle>
              <CardDescription>
                Days each store was live, by size: a store live all month counts the month&apos;s days. Suspended stores don&apos;t count. Its
                bill is list price less {reseller.wholesalePercent}%.
              </CardDescription>
            </div>
            <div className="flex gap-1">
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
                  {SIZES.map((s) => (
                    <TableHead key={s.size} className="text-right">
                      {s.label}
                    </TableHead>
                  ))}
                  <TableHead className="pr-6 text-right">Store-days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.products.map((p) => (
                  <TableRow key={p.productId}>
                    <TableCell className="pl-6">{p.name ?? <span className="text-muted-foreground">Deleted storefront</span>}</TableCell>
                    {SIZES.map((s) => (
                      <TableCell key={s.size} className="text-right tabular-nums">
                        {formatDays(p.storeDays[s.size])}
                      </TableCell>
                    ))}
                    <TableCell className="pr-6 text-right tabular-nums">{formatDays(totalDays(p.storeDays))}</TableCell>
                  </TableRow>
                ))}
                {usage.products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                      No live stores this month.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {usage.products.length > 1 && (
                <TableFooter>
                  <TableRow>
                    <TableCell className="pl-6 font-medium">Total</TableCell>
                    {SIZES.map((s) => (
                      <TableCell key={s.size} className="text-right tabular-nums">
                        {formatDays(usage.storeDays[s.size])}
                      </TableCell>
                    ))}
                    <TableCell className="pr-6 text-right font-medium tabular-nums">{formatDays(totalDays(usage.storeDays))}</TableCell>
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
