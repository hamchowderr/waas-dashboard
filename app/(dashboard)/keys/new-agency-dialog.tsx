"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
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
import type { NewAgency } from "@/lib/api/types";
import { createAgency } from "../actions";
import { SecretDialog } from "./secret-dialog";

/** "New agency": creates the agency's storefront and its first API key, then shows the secret once. */
export function NewAgencyButton() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [limit, setLimit] = React.useState("");
  const [created, setCreated] = React.useState<NewAgency | null>(null);
  const [pending, startTransition] = React.useTransition();

  const limitError =
    limit && !/^\d{1,6}$/.test(limit)
      ? "A whole number, or empty for no limit."
      : null;
  const ready = name.trim() && !limitError;

  const submit = () =>
    startTransition(async () => {
      const result = await createAgency(name, limit ? Number(limit) : null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      setName("");
      setLimit("");
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
