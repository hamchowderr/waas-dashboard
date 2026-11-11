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
import { formatDateTime } from "@/lib/format";
import { notifyOwner } from "../../actions";

/**
 * "Email the owner their sign-in link": the email New site can send when a store is made, sent later, for a
 * store made without it. The owner gets a link to set their password, in the storefront's brand. When it already
 * went, the dialog says when and to whom before it goes again.
 */
export function EmailOwner({
  tenantId,
  storeName,
  lastSentAt,
  lastSentTo,
  ownerEmail,
  open,
  onOpenChange: setOpen
}: {
  /** Opened from the store's actions menu. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  storeName: string;
  lastSentAt: string | null;
  lastSentTo: string | null;
  ownerEmail: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = React.useState(ownerEmail ?? lastSentTo ?? "");
  const [pending, startTransition] = React.useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await notifyOwner(tenantId, email);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Sent. ${email.trim()} can now set their password and sign in.`);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Email the owner their sign-in link</DialogTitle>
            <DialogDescription>
              They get an email saying {storeName} is ready, with a link to set their password. The link works once,
              within a day.
            </DialogDescription>
          </DialogHeader>
          {lastSentAt && (
            <p className="bg-muted rounded-md px-3 py-2 text-sm">
              Already sent {formatDateTime(lastSentAt)} to {lastSentTo}. Sending again gives them a new link; the old
              one stops working.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email-owner-address">Owner&apos;s email</Label>
            <Input
              id="email-owner-address"
              type="email"
              value={email}
              required
              disabled={pending}
              autoComplete="off"
              aria-describedby="email-owner-help"
              onChange={(event) => setEmail(event.target.value)}
            />
            <p id="email-owner-help" className="text-muted-foreground text-sm">
              {ownerEmail
                ? "The email the site was made with, filled in for you. It must be someone who can sign in to the site."
                : "The email of someone who can sign in to the site."}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !email.trim()}>
              {pending && <Spinner />}
              {lastSentAt ? "Send again" : "Send email"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
