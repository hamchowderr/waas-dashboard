"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLinkIcon, StoreIcon } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import type { ReadyStorefront } from "@/lib/api/types";
import { buildStorefront } from "../actions";
import {
  EMPTY_STOREFRONT,
  StorefrontFields,
  storefrontFieldsError,
} from "./storefront-fields";

/**
 * The product's ready-made storefront: its address and state, or, for the platform admin, a button that builds one.
 * Customers who sell from their own site see nothing here.
 */
export function StorefrontCard({
  productId,
  productName,
  storefront,
  canBuild,
}: {
  productId: string;
  productName: string;
  storefront: ReadyStorefront | null;
  canBuild: boolean;
}) {
  if (!storefront && !canBuild) return null;
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3">
        <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md border">
          <StoreIcon className="size-4" />
        </span>
        {storefront ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="font-medium">Ready-made storefront</p>
              <p className="text-muted-foreground truncate text-sm">
                {storefront.domain}
              </p>
            </div>
            <StatusBadge statusCode={storefront.statusCode} />
            {canBuild && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/stores/${storefront.id}`}>Store page</Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <a href={`https://${storefront.domain}/wp-admin/`} target="_blank" rel="noreferrer">
                WordPress admin <ExternalLinkIcon />
              </a>
            </Button>
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="font-medium">No ready-made storefront</p>
              <p className="text-muted-foreground text-sm">
                They sell from their own WordPress site with WaaS Host, or you
                can build them one that is already connected.
              </p>
            </div>
            <BuildStorefrontButton productId={productId} productName={productName} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BuildStorefrontButton({ productId, productName }: { productId: string; productName: string }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(productName);
  const [site, setSite] = React.useState(EMPTY_STOREFRONT);
  const [pending, startTransition] = React.useTransition();
  const ready = name.trim() && !storefrontFieldsError(site);

  const submit = () =>
    startTransition(async () => {
      const result = await buildStorefront(productId, name, site);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Building the storefront at ${result.data.domain}`);
      setOpen(false);
      setSite(EMPTY_STOREFRONT);
    });

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Build a storefront
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Build a storefront</DialogTitle>
            <DialogDescription>
              A WordPress site with WaaS Host and FluentCart, connected to{" "}
              {productName} with a new API key. The owner adds a payment method
              and their plans, then sells.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="storefront-name">Site title</Label>
              <Input
                id="storefront-name"
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <StorefrontFields value={site} onChange={setSite} idPrefix="storefront" />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!ready || pending} onClick={submit}>
              {pending && <Spinner />}
              Build storefront
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
