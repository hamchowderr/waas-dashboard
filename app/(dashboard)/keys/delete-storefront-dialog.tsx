"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import { deleteStorefront } from "../actions";

/** "Delete": removes a storefront that has no stores, with its keys and settings. Platform admin only. */
export function DeleteStorefrontButton({ productId, name }: { productId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const submit = () =>
    startTransition(async () => {
      const result = await deleteStorefront(productId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted ${name}`);
      setOpen(false);
      router.push("/keys");
      router.refresh();
    });

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Trash2Icon /> Delete
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {name}?</DialogTitle>
            <DialogDescription>
              The storefront has no stores. Deleting it also removes its API keys, versions, templates and settings, so
              anything still signing in with its keys stops working. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submit} disabled={pending}>
              {pending && <Spinner />} Delete storefront
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
