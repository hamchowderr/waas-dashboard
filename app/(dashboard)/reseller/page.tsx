import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeysManager } from "../keys/keys-manager";
import { BillCard, InvoicesCard } from "../resellers/bill-parts";
import { monthRange } from "../resellers/usage";

export const metadata: Metadata = { title: "Reseller account" };

const TABS = ["bill", "keys"] as const;

/**
 * A reseller's own team: its monthly bill, the invoices sent for it, and its partner keys. The platform admin
 * sees the same on the reseller's page under Resellers.
 */
export default async function ResellerAccountPage({ searchParams }: { searchParams: Promise<{ month?: string; tab?: string }> }) {
  const viewer = await getViewer();
  const resellerId = viewer?.active?.resellerId;
  if (!viewer || viewer.isAdmin || !resellerId) notFound();
  const query = await searchParams;
  const month = monthRange(query.month);
  const tab = TABS.find((t) => t === query.tab) ?? "bill";
  const api = getAdminApi();
  const [reseller, bill, invoicing, keys] = await Promise.all([
    api.reseller(resellerId),
    api.resellerBill(resellerId, month.month),
    api.resellerInvoices(resellerId),
    api.partnerKeys(resellerId)
  ]);
  if (!reseller) notFound();
  const monthHref = (m: string) => `/reseller?month=${m}&tab=bill`;

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title={reseller.name}
        description={`${reseller.liveTenantCount} live of ${reseller.tenantCount} stores across ${reseller.products.length} storefront${reseller.products.length === 1 ? "" : "s"}, at ${reseller.wholesalePercent}% off list.`}
      />
      <Tabs defaultValue={tab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="bill">Bill</TabsTrigger>
          <TabsTrigger value="keys">Partner keys</TabsTrigger>
        </TabsList>
        <TabsContent value="bill" className="grid gap-4 lg:grid-cols-3 lg:gap-6">
          <BillCard
            bill={bill}
            month={month}
            current={monthRange(undefined).month}
            resellerName={reseller.name}
            autoSend={invoicing.enabled && reseller.autoInvoice}
            monthHref={monthHref}
          />
          <Card>
            <CardHeader>
              <CardTitle>Storefronts</CardTitle>
              <CardDescription>Switch between them at the top of the page. Each one&apos;s live stores count toward this bill.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {reseller.products.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {p.tenantCount} {p.tenantCount === 1 ? "store" : "stores"}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <InvoicesCard
            invoicing={invoicing}
            monthHref={monthHref}
            description={
              invoicing.enabled && reseller.autoInvoice
                ? "Each month's bill goes out through Stripe on the 1st, to your billing email."
                : "Ask AnyPress at support@anypress.io about a bill that hasn't arrived."
            }
          />
        </TabsContent>
        <TabsContent value="keys">
          <KeysManager partner productId={reseller.id} productName={reseller.name} keys={keys} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
