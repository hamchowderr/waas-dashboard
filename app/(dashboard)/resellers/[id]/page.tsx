import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeysManager } from "../../keys/keys-manager";
import { BrandingEditor } from "../../branding/branding-editor";
import { TeamManager } from "../../team/team-manager";
import { formatMoney, monthRange } from "../usage";
import { DeleteReseller } from "./delete-reseller";
import { ResellerSettingsForm } from "./settings-form";
import { SendInvoice } from "./send-invoice";
import { AddStorefrontButton } from "../../reseller/add-storefront-dialog";
import { ResellerStorefronts } from "./storefronts";
import { BillCard, InvoicesCard } from "../bill-parts";

export const metadata: Metadata = { title: "Reseller" };



const TABS = ["bill", "keys", "team", "branding", "settings"] as const;

export default async function ResellerPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string; tab?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) notFound();
  const { id } = await params;
  const api = getAdminApi();
  const reseller = /^[0-9a-f-]{36}$/i.test(id) ? await api.reseller(id) : null;
  if (!reseller) notFound();
  const query = await searchParams;
  const month = monthRange(query.month);
  const tab = TABS.find((t) => t === query.tab) ?? "bill";
  const [bill, invoicing, products, keys, team, branding] = await Promise.all([
    api.resellerBill(reseller.id, month.month),
    api.resellerInvoices(reseller.id),
    api.products(),
    api.partnerKeys(reseller.id),
    api.team({ resellerId: reseller.id }),
    api.branding({ resellerId: reseller.id })
  ]);
  const current = monthRange(undefined).month;
  const invoice = invoicing.invoices.find((i) => i.month === bill.month);
  const autoSend = invoicing.enabled && reseller.autoInvoice;

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
      {/* One part at a time instead of one long page; ?tab= keeps the place across a month change or a reload. */}
      <Tabs defaultValue={tab} className="space-y-4">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="bill">Bill</TabsTrigger>
          <TabsTrigger value="keys">Keys</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="bill" className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <BillCard
          bill={bill}
          month={month}
          current={current}
          resellerName={reseller.name}
          autoSend={autoSend}
          monthHref={(m) => `/resellers/${reseller.id}?month=${m}&tab=bill`}
        />
        <Card>
          <CardHeader>
            <CardTitle>Storefronts</CardTitle>
            <CardDescription>Each keeps its keys, team and stores. Its live stores count toward this bill.</CardDescription>
            <CardAction>
              <AddStorefrontButton resellerId={reseller.id} storefronts={reseller.products} maxProducts={reseller.maxProducts} />
            </CardAction>
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
        <InvoicesCard
          invoicing={invoicing}
          monthHref={(m) => `/resellers/${reseller.id}?month=${m}&tab=bill`}
          description={
            !invoicing.enabled
              ? "Automatic invoices are off: the API has no Stripe key, so send bills yourself."
              : reseller.autoInvoice
                ? "Each month's bill goes out through Stripe on the 1st."
                : "Automatic invoices are off for this reseller (Settings). You can still send a month from here."
          }
          action={
            invoicing.enabled && bill.complete && bill.totalCents > 0 && (!invoice || invoice.status === "failed") && (
              <SendInvoice
                id={reseller.id}
                month={bill.month}
                label={month.label}
                total={formatMoney(bill.totalCents)}
                to={bill.billingEmail}
                retry={invoice?.status === "failed"}
              />
            )
          }
        />
        </TabsContent>
        <TabsContent value="keys">
          <KeysManager partner productId={reseller.id} productName={reseller.name} keys={keys} />
        </TabsContent>
        <TabsContent value="team" className="space-y-4 lg:space-y-6">
          <TeamManager reseller productId={reseller.id} productName={reseller.name} team={team} me={{ userId: viewer.user.id, role: null }} />
        </TabsContent>
        <TabsContent value="branding" className="space-y-2">
          <p className="text-muted-foreground text-sm">
            The look every one of this reseller&apos;s storefronts gets in the dashboard. Each storefront can change its own name,
            logo and color on its Branding page.
          </p>
          <BrandingEditor of={{ resellerId: reseller.id }} initial={branding} canEdit brandName={reseller.brandName} />
        </TabsContent>
        <TabsContent value="settings">
          <Card className="max-w-3xl">
            <CardContent>
              <ResellerSettingsForm id={reseller.id} settings={reseller} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
