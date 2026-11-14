"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import type { DomainSetup } from "@/lib/api/types";
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
import { DomainRecords, useDomainCheck } from "./domain-setup";

/**
 * Moves a store to a new main address. First it shows the DNS records the address needs (and the
 * one-click button when its DNS host has one), so the domain is pointed before the store moves.
 * The old address keeps working as a redirect.
 */
export function ChangeAddress({ tenantId, mainDomain }: { tenantId: string; mainDomain: string | null }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [domain, setDomain] = React.useState("");
  const [setup, setSetupState] = React.useState<DomainSetup | null>(null);
  // "Move anyway" asks once more, since the site stops loading until the records are in place.
  const [confirming, setConfirming] = React.useState(false);
  const setSetup = (next: DomainSetup | null) => {
    setSetupState(next);
    setConfirming(false);
  };
  const [pending, startTransition] = React.useTransition();
  const { checking, check } = useDomainCheck(tenantId);
  const busy = pending || checking;

  const reset = () => {
    setDomain("");
    setSetup(null);
  };

  const move = () =>
    startTransition(async () => {
      if (!setup) return;
      const result = await setMainDomain(tenantId, setup.domainName);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Moving the store to ${setup.domainName}. It shows Ready when it's done.`);
      reset();
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Change address
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (busy) return;
          setOpen(next);
          if (!next) reset();
        }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="pe-6 break-words">{setup ? `Point ${setup.domainName} at the store` : "Change address"}</DialogTitle>
            <DialogDescription>
              {setup
                ? setup.pointsHere
                  ? `The domain is ready. The store moves to it${mainDomain ? ` and ${mainDomain} redirects there` : ""}.`
                  : "Add these records first. Moving before the domain points here leaves the site unreachable at the new address."
                : `The store moves to the new address${mainDomain ? ` and ${mainDomain} redirects to it` : ""}. Next you get the DNS records to add.`}
            </DialogDescription>
          </DialogHeader>
          {setup ? (
            <>
              <DomainRecords setup={setup} />
              {confirming && (
                <p
                  role="alert"
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
                  <span className="font-medium">Are you sure?</span> The site won&apos;t load at {setup.domainName} until
                  these records are in place. Move now only if you have just added them and the check hasn&apos;t caught
                  up yet.
                </p>
              )}
            </>
          ) : (
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (domain.trim()) check(domain, setSetup);
              }}>
              <Label htmlFor="new-address">New address</Label>
              <Input
                id="new-address"
                value={domain}
                placeholder="shop.example.com"
                disabled={busy}
                autoComplete="off"
                onChange={(event) => setDomain(event.target.value)}
              />
            </form>
          )}
          <DialogFooter>
            {setup ? (
              <>
                <Button variant="outline" disabled={busy} onClick={() => setSetup(null)}>
                  Back
                </Button>
                {setup.pointsHere ? (
                  <Button disabled={busy} onClick={move}>
                    {pending && <Spinner />}
                    Move store
                  </Button>
                ) : (
                  <>
                    {confirming ? (
                      <Button variant="destructive" disabled={busy} onClick={move}>
                        {pending && <Spinner />}
                        Yes, move now
                      </Button>
                    ) : (
                      <Button variant="outline" disabled={busy} onClick={() => setConfirming(true)}>
                        Move anyway
                      </Button>
                    )}
                    <Button disabled={busy} onClick={() => check(setup.domainName, setSetup)}>
                      {checking ? <Spinner /> : <RefreshCw />}
                      Check again
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={busy || !domain.trim()} onClick={() => check(domain, setSetup)}>
                  {checking && <Spinner />}
                  Next
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
