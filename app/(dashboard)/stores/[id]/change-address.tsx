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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { setMainDomain } from "../../actions";

/** Moves a store to a new main address. The old address keeps working as a redirect. */
export function ChangeAddress({ tenantId, mainDomain }: { tenantId: string; mainDomain: string | null }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [domain, setDomain] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const submit = () =>
    startTransition(async () => {
      const result = await setMainDomain(tenantId, domain);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Moving the store to ${domain.trim().toLowerCase()}. It shows Ready when it's done.`);
      setDomain("");
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Change address
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Change address</DialogTitle>
            <DialogDescription>
              The store moves to the new address{mainDomain ? ` and ${mainDomain} redirects to it` : ""}. The
              address must point at the store server in DNS.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (domain.trim()) submit();
            }}>
            <Label htmlFor="new-address">New address</Label>
            <Input
              id="new-address"
              value={domain}
              placeholder="shop.anypress.io"
              disabled={pending}
              autoComplete="off"
              onChange={(event) => setDomain(event.target.value)}
            />
          </form>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending || !domain.trim()} onClick={submit}>
              {pending && <Spinner />}
              Move store
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
