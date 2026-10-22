import type { Metadata } from "next";
import Link from "next/link";
import { HandshakeIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewResellerButton } from "./new-reseller-dialog";
import { formatDays, monthRange, totalDays } from "./usage";

export const metadata: Metadata = { title: "Resellers" };

const limit = (n: number | null) => (n === null ? "no limit" : `limit ${n}`);

export default async function ResellersPage() {
  if (!(await getViewer())?.isAdmin) notFound();
  const api = getAdminApi();
  const month = monthRange(undefined);
  const [resellers, products] = await Promise.all([api.resellers(), api.products()]);
  const usage = await Promise.all(resellers.map((r) => api.resellerUsage(r.id, month.from, month.to)));

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Resellers"
        description="Partners that sell stores from their own storefronts and pay a wholesale price for every live store across them.">
        <NewResellerButton storefronts={products.filter((p) => !p.resellerId).map(({ id, name }) => ({ id, name }))} />
      </PageHeader>
      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Reseller</TableHead>
                <TableHead>Storefronts</TableHead>
                <TableHead>Stores</TableHead>
                <TableHead>Wholesale</TableHead>
                <TableHead className="pr-4 text-right">Store-days in {month.label}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resellers.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-4 font-medium">
                    <Link href={`/resellers/${r.id}`} className="hover:underline">
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {r.products.length} <span className="text-muted-foreground text-xs">({limit(r.maxProducts)})</span>
                  </TableCell>
                  <TableCell>
                    {r.liveTenantCount} live of {r.tenantCount} <span className="text-muted-foreground text-xs">({limit(r.maxTenants)})</span>
                  </TableCell>
                  <TableCell>{r.wholesalePercent}% off</TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">{formatDays(totalDays(usage[i]!.storeDays))}</TableCell>
                </TableRow>
              ))}
              {resellers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    <EmptyState
                      icon={HandshakeIcon}
                      title="No resellers yet"
                      action={<NewResellerButton storefronts={products.filter((p) => !p.resellerId).map(({ id, name }) => ({ id, name }))} />}>
                      A reseller runs several storefronts under one sign-in and gets one monthly bill at a wholesale price.
                    </EmptyState>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
