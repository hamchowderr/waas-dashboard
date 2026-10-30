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
  DialogTitle
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { goLive } from "../../actions";

/**
 * Ends the hold of a site moved in, after saying what changes. onBaseAddress: the store is still on its
 * AnyPress address, so the owner most likely hasn't pointed their domain at it yet.
 */
export function GoLive({
  tenantId,
  storeName,
  onBaseAddress
}: {
  tenantId: string;
  storeName: string;
  onBaseAddress: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const submit = () =>
    startTransition(async () => {
      const result = await goLive(tenantId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${storeName} is going live. It shows Ready when it's done.`);
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Go live
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Make {storeName} live?</DialogTitle>
            <DialogDescription>From now on this store acts as the real site:</DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1.5 ps-5 text-sm">
            <li>Its scheduled tasks start: subscription renewals, order clean-ups, newsletter and feed syncs.</li>
            <li>Its email goes to everyone again, customers included.</li>
            <li>Search engines may index it.</li>
          </ul>
          <p className="text-muted-foreground text-sm">
            {onBaseAddress
              ? "It still uses its AnyPress address. Point your domain at it first (Change address under Domains), and switch off the old site's scheduled tasks and email, so customers don't get everything twice."
              : "Point your domain at this store first, and switch off the old site's scheduled tasks and email, so customers don't get everything twice."}{" "}
            The hold can&apos;t be turned back on.
          </p>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending} onClick={submit}>
              {pending && <Spinner />}
              Go live
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
