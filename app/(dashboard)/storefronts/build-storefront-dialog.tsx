"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { buildStorefront } from "../actions";
import { EMPTY_STOREFRONT, StorefrontFields, storefrontFieldsError } from "../keys/storefront-fields";
import type { DialogControl } from "./rename-storefront-dialog";

/**
 * "Build a storefront": a ready-made WordPress shop with AnyPress Host, connected to a storefront that sells
 * from nowhere yet. Opened from the Storefronts page's row menu. Platform admin only.
 */
export function BuildStorefrontDialog({
  productId,
  productName,
  control
}: {
  productId: string;
  productName: string;
  control: DialogControl;
}) {
  const router = useRouter();
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
      control.onOpenChange(false);
      router.refresh();
    });

  return (
    <Dialog open={control.open} onOpenChange={(next) => !pending && control.onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Build a storefront</DialogTitle>
          <DialogDescription>
            A WordPress site with AnyPress Host and FluentCart, connected to {productName} with a new API key. The owner
            adds a payment method and their plans, then sells.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="storefront-title">Site title</Label>
            <Input id="storefront-title" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
          </div>
          <StorefrontFields value={site} onChange={setSite} idPrefix="storefront" />
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => control.onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!ready || pending} onClick={submit}>
            {pending && <Spinner />}
            Build storefront
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
