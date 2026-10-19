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
import { Spinner } from "@/components/ui/spinner";
import type { NewAgency } from "@/lib/api/types";
import { createAgency } from "../actions";
import { SecretDialog } from "./secret-dialog";
import {
  EMPTY_STOREFRONT,
  StorefrontFields,
  storefrontFieldsError,
} from "./storefront-fields";

/**
 * "New agency": creates the agency's storefront and its first API key, then shows the secret once. With "Build a
 * storefront for them", the platform also builds them a WordPress site with WaaS Host, already connected.
 */
export function NewAgencyButton() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [limit, setLimit] = React.useState("");
  const [buildSite, setBuildSite] = React.useState(false);
  const [site, setSite] = React.useState(EMPTY_STOREFRONT);
  const [created, setCreated] = React.useState<NewAgency | null>(null);
  const [pending, startTransition] = React.useTransition();

  const limitError =
    limit && !/^\d{1,6}$/.test(limit)
      ? "A whole number, or empty for no limit."
      : null;
  const ready = name.trim() && !limitError && !(buildSite && storefrontFieldsError(site));

  const submit = () =>
    startTransition(async () => {
      const result = await createAgency(name, limit ? Number(limit) : null, buildSite ? site : null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data.storefront) toast.success(`Building their storefront at ${result.data.storefront.domain}`);
      if (result.data.storefrontError) toast.error(`The agency is set up, but its storefront wasn't built: ${result.data.storefrontError}`);
      setOpen(false);
      setName("");
      setLimit("");
      setBuildSite(false);
      setSite(EMPTY_STOREFRONT);
      setCreated(result.data);
    });

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon /> New agency
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New agency</DialogTitle>
            <DialogDescription>
              Creates the agency&apos;s storefront and its first API key. They
              can then create, rotate and revoke their own keys through the API.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="agency-name">Agency name</Label>
              <Input
                id="agency-name"
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agency-limit">Store limit</Label>
              <Input
                id="agency-limit"
                inputMode="numeric"
                placeholder="No limit"
                value={limit}
                onChange={(e) => setLimit(e.target.value.trim())}
              />
              <p
                className={
                  limitError
                    ? "text-destructive text-sm"
                    : "text-muted-foreground text-sm"
                }
              >
                {limitError ??
                  "The most stores the agency can create. Leave empty for no limit."}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="agency-build-site"
                checked={buildSite}
                onCheckedChange={(v) => setBuildSite(v === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="agency-build-site">Build a storefront for them</Label>
                <p className="text-muted-foreground text-sm">
                  A WordPress site with WaaS Host and FluentCart, already
                  connected. Leave it off when they sell from their own site.
                </p>
              </div>
            </div>
            {buildSite && (
              <StorefrontFields value={site} onChange={setSite} idPrefix="agency-site" />
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={!ready || pending} onClick={submit}>
              {pending && <Spinner />}
              Create agency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SecretDialog
        secret={
          created && {
            title: `${created.name} is set up`,
            keyId: created.key.id,
            secret: created.key.secret,
          }
        }
        onClose={() => {
          const productId = created?.productId;
          setCreated(null);
          if (productId) router.push(`/keys?product=${productId}`);
        }}
      />
    </>
  );
}
