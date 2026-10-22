"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  KeyRoundIcon,
  ListIcon,
  MoreHorizontalIcon,
  PlusIcon,
  PowerIcon,
  PowerOffIcon,
  SendIcon,
  Trash2Icon,
  WebhookIcon
} from "lucide-react";
import { toast } from "sonner";

import type { WebhookEndpoint } from "@/lib/api/types";
import { urlHost } from "@/lib/display";
import { formatAgo, webhookEventLabel } from "@/lib/format";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteWebhook, rotateWebhookSecret, testWebhook, updateWebhook } from "../actions";
import { AddEndpointDialog } from "./add-endpoint-dialog";

/** Below sm the header's button moves under its text instead of squeezing it. */
const headerClass = "max-sm:has-data-[slot=card-action]:grid-cols-1";
const actionClass = "max-sm:col-start-1 max-sm:row-span-1 max-sm:row-start-auto max-sm:justify-self-start";

const tableClass =
  "[&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)";

type Pending = { kind: "rotate" | "delete"; endpoint: WebhookEndpoint } | null;

/** A secret to show once, with the endpoint it belongs to. */
type ShownSecret = { url: string; secret: string; isNew: boolean } | null;

/** Runs an action and toasts its outcome; true on success. */
async function report(action: Promise<{ ok: true } | { ok: false; error: string }>, success: string) {
  const result = await action;
  if (result.ok) toast.success(success);
  else toast.error(result.error);
  return result.ok;
}

function Events({ eventTypes }: { eventTypes: string[] }) {
  if (eventTypes.length === 0) return <span className="text-muted-foreground">All events</span>;
  return (
    <div className="flex max-w-72 flex-wrap gap-1">
      {eventTypes.map((type) => (
        <Badge key={type} variant="outline" title={type}>
          {webhookEventLabel(type)}
        </Badge>
      ))}
    </div>
  );
}

function LastDay({ endpoint }: { endpoint: WebhookEndpoint }) {
  const { sent, failed } = endpoint.last24Hours;
  return (
    <span className="tabular-nums whitespace-nowrap">
      {sent} sent
      {failed > 0 && <span className="text-destructive">, {failed} failed</span>}
    </span>
  );
}

export function WebhookEndpoints({
  endpoints,
  storefronts,
  productId
}: {
  endpoints: WebhookEndpoint[];
  storefronts: { id: string; name: string }[];
  /** The storefront the page is narrowed to, if any. */
  productId?: string;
}) {
  const [pending, setPending] = React.useState<Pending>(null);
  const [adding, setAdding] = React.useState(false);
  const [shown, setShown] = React.useState<ShownSecret>(null);
  const deliveriesHref = (endpoint: WebhookEndpoint) =>
    `/webhooks?${new URLSearchParams({ ...(productId ? { product: productId } : {}), endpoint: endpoint.id })}`;

  return (
    <>
      <Card>
        <CardHeader className={headerClass}>
          <CardTitle>Endpoints</CardTitle>
          <CardDescription>
            A storefront adds its own through the API, or add one here. Each has a secret the receiver uses to check
            the signature.
          </CardDescription>
          <CardAction className={actionClass}>
            <Button size="sm" onClick={() => setAdding(true)} disabled={storefronts.length === 0}>
              <PlusIcon /> Add endpoint
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="p-0">
          <Table className={tableClass}>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint</TableHead>
                <TableHead className="max-md:hidden">Storefront</TableHead>
                <TableHead className="max-lg:hidden">Events</TableHead>
                <TableHead className="max-sm:hidden">Last 24 hours</TableHead>
                <TableHead className="max-lg:hidden">Pending</TableHead>
                <TableHead className="max-xl:hidden">Last attempt</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpoints.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      icon={WebhookIcon}
                      title="No endpoints yet"
                      action={
                        <Button size="sm" onClick={() => setAdding(true)} disabled={storefronts.length === 0}>
                          <PlusIcon /> Add endpoint
                        </Button>
                      }>
                      An endpoint is an address on your own site or app that hears about store changes as they happen.
                    </EmptyState>
                  </TableCell>
                </TableRow>
              )}
              {endpoints.map((endpoint) => (
                <TableRow key={endpoint.id}>
                  <TableCell className="max-w-96 whitespace-normal">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium break-all" title={endpoint.url}>
                        {urlHost(endpoint.url)}
                      </span>
                      {endpoint.enabled ? <Badge variant="success">On</Badge> : <Badge variant="outline">Off</Badge>}
                    </div>
                    {endpoint.description && <p className="text-muted-foreground text-sm">{endpoint.description}</p>}
                    {/* The columns hidden on narrow screens, under the address instead. */}
                    <div className="text-muted-foreground mt-1 space-y-1 text-xs xl:hidden">
                      <div className="md:hidden">{endpoint.productName}</div>
                      <div className="lg:hidden">
                        <Events eventTypes={endpoint.eventTypes} />
                      </div>
                      <div className="sm:hidden">
                        Last 24 hours: <LastDay endpoint={endpoint} />
                      </div>
                      {endpoint.pending > 0 && <div className="lg:hidden">{endpoint.pending} pending</div>}
                      <div>Last attempt {formatAgo(endpoint.lastAttemptAt)}</div>
                    </div>
                  </TableCell>
                  <TableCell className="max-md:hidden">{endpoint.productName}</TableCell>
                  <TableCell className="whitespace-normal max-lg:hidden">
                    <Events eventTypes={endpoint.eventTypes} />
                  </TableCell>
                  <TableCell className="max-sm:hidden">
                    <LastDay endpoint={endpoint} />
                  </TableCell>
                  <TableCell className="tabular-nums max-lg:hidden">{endpoint.pending}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap max-xl:hidden">
                    {formatAgo(endpoint.lastAttemptAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <span className="sr-only">Actions for {endpoint.url}</span>
                          <MoreHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() =>
                            void report(testWebhook(endpoint.id), "Test event sent. It shows under deliveries.")
                          }>
                          <SendIcon /> Send test
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={deliveriesHref(endpoint)}>
                            <ListIcon /> Show deliveries
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            void report(
                              updateWebhook(endpoint.id, { enabled: !endpoint.enabled }),
                              endpoint.enabled ? "Endpoint turned off" : "Endpoint turned on"
                            )
                          }>
                          {endpoint.enabled ? (
                            <>
                              <PowerOffIcon /> Disable
                            </>
                          ) : (
                            <>
                              <PowerIcon /> Enable
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setPending({ kind: "rotate", endpoint })}>
                          <KeyRoundIcon /> Rotate secret
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setPending({ kind: "delete", endpoint })}>
                          <Trash2Icon /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddEndpointDialog
        key={productId ?? "all"}
        open={adding}
        onOpenChange={setAdding}
        storefronts={storefronts}
        defaultProductId={productId}
        onCreated={(created) => {
          toast.success("Endpoint added");
          setShown({ url: created.url, secret: created.secret, isNew: true });
        }}
      />

      <ConfirmAction
        open={pending?.kind === "rotate"}
        onOpenChange={(open) => !open && setPending(null)}
        title="Rotate this endpoint's secret?"
        description={
          <>
            <p className="break-all">{pending?.endpoint.url}</p>
            <p>The old secret stops working at once. Deliveries fail their signature check until the receiver has the new one.</p>
          </>
        }
        confirmLabel="Rotate secret"
        onConfirm={async () => {
          if (pending?.kind !== "rotate") return false;
          const result = await rotateWebhookSecret(pending.endpoint.id);
          if (!result.ok) {
            toast.error(result.error);
            return false;
          }
          setShown({ url: pending.endpoint.url, secret: result.data, isNew: false });
          return true;
        }}
      />
      <ConfirmAction
        open={pending?.kind === "delete"}
        onOpenChange={(open) => !open && setPending(null)}
        title="Delete this endpoint?"
        description={
          <>
            <p className="break-all">{pending?.endpoint.url}</p>
            <p>It gets no more webhooks, and its deliveries are removed. This can&apos;t be undone.</p>
          </>
        }
        confirmLabel="Delete endpoint"
        destructive
        onConfirm={() =>
          pending?.kind === "delete" ? report(deleteWebhook(pending.endpoint.id), "Endpoint deleted") : Promise.resolve(false)
        }
      />

      <SecretDialog shown={shown} onClose={() => setShown(null)} />
    </>
  );
}

function SecretDialog({ shown, onClose }: { shown: ShownSecret; onClose: () => void }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <Dialog open={!!shown} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {shown && (
          <>
            <DialogHeader>
              <DialogTitle>{shown.isNew ? "Endpoint added" : "New secret"}</DialogTitle>
              <DialogDescription className="break-all">{shown.url}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input readOnly value={shown.secret} className="font-mono text-xs" aria-label="Signing secret" onFocus={(e) => e.target.select()} />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={async () => {
                    await navigator.clipboard.writeText(shown.secret);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}>
                  {copied ? <Check /> : <Copy />}
                  <span className="sr-only">Copy secret</span>
                </Button>
              </div>
              <p className="text-muted-foreground text-sm">
                Copy it now: it won&apos;t be shown again. The receiver at this URL uses it to check each delivery&apos;s
                signature.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
