"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { pickStorefront } from "@/lib/auth-client";
import { addResellerStorefront } from "../actions";
import {
  EMPTY_STOREFRONT,
  StorefrontFields,
  storefrontFieldsError,
} from "../keys/storefront-fields";

/**
 * "Add storefront": one more storefront in a reseller's account, usually one per brand, up to its storefront
 * limit. It can start ready from one of the account's storefronts and get its own shop site. organizationId is
 * the reseller team's, so its own people can switch to the new storefront straight away; the platform admin
 * passes none.
 */
export function AddStorefrontButton({
  resellerId,
  storefronts,
  maxProducts,
  startFrom: preferred,
  organizationId,
}: {
  resellerId: string;
  storefronts: { id: string; name: string }[];
  maxProducts: number | null;
  /** The storefront to start from unless another is picked. */
  startFrom?: string;
  organizationId?: string;
}) {
  const router = useRouter();
  const full = maxProducts !== null && storefronts.length >= maxProducts;
  const fallback = preferred ?? storefronts[0]?.id ?? "none";
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [startFrom, setStartFrom] = React.useState(fallback);
  const [buildSite, setBuildSite] = React.useState(false);
  const [site, setSite] = React.useState(EMPTY_STOREFRONT);
  const [pending, startTransition] = React.useTransition();

  const ready = name.trim() && !(buildSite && storefrontFieldsError(site));

  const reset = () => {
    setName("");
    setStartFrom(fallback);
    setBuildSite(false);
    setSite(EMPTY_STOREFRONT);
  };

  const openIt = async (productId: string) => {
    try {
      await pickStorefront({ organizationId: organizationId!, productId });
      router.replace("/");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const submit = () =>
    startTransition(async () => {
      const result = await addResellerStorefront(
        resellerId,
        name,
        startFrom === "none" ? null : startFrom,
        buildSite ? site : null
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { product, storefront, storefrontError } = result.data;
      toast.success(
        `${product.name} is ready.${startFrom === "none" ? "" : " Its WordPress version is building; New site works once it has."}`,
        organizationId ? { action: { label: "Switch to it", onClick: () => void openIt(product.id) } } : undefined
      );
      if (storefront) toast.success(`Building its shop site at ${storefront.domain}`);
      if (storefrontError) toast.error(`The storefront is set up, but its shop site wasn't built: ${storefrontError}`);
      setOpen(false);
      reset();
      router.refresh();
    });

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        disabled={full}
        title={full ? `You have all ${maxProducts} storefronts this account allows. Ask AnyPress at support@anypress.io for more.` : undefined}
      >
        <PlusIcon /> Add storefront
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add storefront</DialogTitle>
            <DialogDescription>
              A new storefront in this account, for another brand. It has its
              own stores, plans and look, and everyone on your team can work on
              it. Its live stores count toward the same monthly bill.
              {maxProducts !== null &&
                ` This is ${storefronts.length + 1} of the ${maxProducts} storefronts this account allows.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="add-storefront-name">Storefront name</Label>
              <Input
                id="add-storefront-name"
                placeholder="The brand it sells under"
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-storefront-start-from">Start ready from</Label>
              <Select value={startFrom} onValueChange={setStartFrom}>
                <SelectTrigger id="add-storefront-start-from" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {storefronts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="none">Nothing: start empty</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-sm">
                Copies that storefront&apos;s WordPress version and starter
                template, so New site works as soon as it has built. Its stores,
                keys and team aren&apos;t copied.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="add-storefront-build-site"
                checked={buildSite}
                onCheckedChange={(v) => setBuildSite(v === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="add-storefront-build-site">Build a shop site for it</Label>
                <p className="text-muted-foreground text-sm">
                  A WordPress site with WaaS Host and FluentCart, already
                  connected, to sell this brand&apos;s websites from. Leave it
                  off when you sell from a site of your own.
                </p>
              </div>
            </div>
            {buildSite && (
              <StorefrontFields value={site} onChange={setSite} idPrefix="add-storefront-site" />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!ready || pending} onClick={submit}>
              {pending && <Spinner />}
              Add storefront
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
