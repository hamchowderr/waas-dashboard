import { TriangleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { getAdminApi } from "@/lib/api/client";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardIcon,
} from "@/components/ui/card";
import { DeliveriesTable } from "./deliveries-table";
import { WebhookEndpoints } from "./webhook-endpoints";
import { PageTabs } from "@/components/admin/page-tabs";
import { TabsContent } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Webhooks" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function WebhooksPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; endpoint?: string; tab?: string }>;
}) {
  const { product, endpoint, tab } = await searchParams;
  const endpointId = endpoint && UUID.test(endpoint) ? endpoint : undefined;
  const api = getAdminApi();
  // The delivery log is the slowest read, across every storefront most of all. When it doesn't
  // answer in time the page still shows the endpoints, so they can be changed or deleted.
  const [endpoints, deliveries, products] = await Promise.all([
    api.webhooks(product),
    api
      .webhookDeliveries({ productId: product, endpointId })
      .catch((error: unknown) => {
        console.error("Webhook deliveries did not load", error);
        return null;
      }),
    api.products(),
  ]);
  const endpointUrl = endpointId
    ? (endpoints.find((e) => e.id === endpointId)?.url ?? "this endpoint")
    : null;

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Webhooks"
        description={`Each endpoint gets a signed POST when a store or version on its storefront changes; a delivery that fails is retried for about seven hours.${deliveries && deliveries.items.length < deliveries.total ? ` Showing the newest ${deliveries.items.length} of ${deliveries.total} deliveries.` : ""}`}
      >
        {endpointUrl && (
          <Button asChild variant="outline" size="sm">
            <Link
              href={
                product
                  ? `/webhooks?product=${encodeURIComponent(product)}`
                  : "/webhooks"
              }
            >
              All endpoints
            </Link>
          </Button>
        )}
      </PageHeader>
      {/* Endpoints and deliveries each get a tab, so the delivery table has the screen to itself. A link to one
          endpoint's deliveries opens on them. */}
      <PageTabs
        label="Webhooks"
        initial={endpointId ? "deliveries" : tab}
        tabs={[
          { value: "endpoints", label: "Endpoints", count: endpoints.length },
          {
            value: "deliveries",
            label: "Deliveries",
            count: deliveries?.total,
          },
        ]}
      >
        <TabsContent value="endpoints">
          <WebhookEndpoints
            endpoints={endpoints}
            storefronts={products.map((p) => ({ id: p.id, name: p.name }))}
            productId={product}
          />
        </TabsContent>
        <TabsContent value="deliveries" className="flex flex-col gap-4">
          <div className="space-y-1">
            {endpointUrl ? (
              <p className="text-sm break-all">
                Only deliveries to {endpointUrl}.
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Retry sends a delivery again from the start, retries included.
              </p>
            )}
          </div>
          {deliveries ? (
            <DeliveriesTable deliveries={deliveries.items} />
          ) : (
            <Card>
              <CardHeader>
                <CardIcon>
                  <TriangleAlertIcon />
                </CardIcon>
                <CardTitle>Deliveries didn&apos;t load</CardTitle>
                <CardDescription>
                  The API took too long to answer. The endpoints still work.
                  Reload the page to try again.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </PageTabs>
    </div>
  );
}
