"use client";

import * as React from "react";
import { MailIcon } from "lucide-react";
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
import { notifyOwner } from "../../actions";

/**
 * "Email the owner their sign-in link": the email New site can send when a store is made, sent later, for a
 * store made without it. The owner gets a link to set their password, in the storefront's brand.
 */
export function EmailOwner({ tenantId, storeName }: { tenantId: string; storeName: string }) {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
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
      setEmail("");
    });
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MailIcon />
        Email the owner
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Email the owner their sign-in link</DialogTitle>
              <DialogDescription>
                They get an email saying {storeName} is ready, with a link to set their password. The link works once,
                within a day. You can send it again at any time.
              </DialogDescription>
            </DialogHeader>
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
                The email the site was made with.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !email.trim()}>
                {pending && <Spinner />}
                Send email
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
