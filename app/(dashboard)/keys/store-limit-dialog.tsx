"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GaugeIcon } from "lucide-react";
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
import { setStoreLimit } from "../actions";

/** "Store limit": the most stores the storefront may have. Platform admin only. */
export function StoreLimitButton({
  productId,
  maxTenants: current,
  tenantCount,
}: {
  productId: string;
  maxTenants: number | null;
  tenantCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(current === null ? "" : String(current));
  const [pending, startTransition] = React.useTransition();
  const text = value.trim();
  const limit = text === "" ? null : Number(text);
  const valid = limit === null || (Number.isInteger(limit) && limit >= 0);
  const ready = valid && limit !== current;

  const submit = () =>
    startTransition(async () => {
      const result = await setStoreLimit(productId, limit);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(limit === null ? "No store limit" : `Store limit is ${limit}`);
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setValue(current === null ? "" : String(current));
          setOpen(true);
        }}>
        <GaugeIcon /> Store limit: {current === null ? "none" : `${tenantCount} of ${current}`}
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Store limit</DialogTitle>
            <DialogDescription>
              The most stores this storefront may have. It has {tenantCount} now. A lower limit deletes nothing; it only
              stops new stores.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (ready && !pending) submit();
            }}>
            <Label htmlFor="store-limit">Stores</Label>
            <Input
              id="store-limit"
              inputMode="numeric"
              placeholder="No limit"
              value={value}
              autoFocus
              aria-invalid={!valid}
              onChange={(e) => setValue(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">Empty for no limit.</p>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!ready || pending}>
              {pending && <Spinner />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
