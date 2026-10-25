"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PencilIcon } from "lucide-react";
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
import { renameStorefront } from "../actions";

/** "Rename": changes the storefront's name everywhere the dashboard shows it. Platform admin only. */
export function RenameStorefrontButton({ productId, name: current }: { productId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(current);
  const [pending, startTransition] = React.useTransition();
  const ready = name.trim() && name.trim() !== current;

  const submit = () =>
    startTransition(async () => {
      const result = await renameStorefront(productId, name);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Renamed to ${name.trim()}`);
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setName(current);
          setOpen(true);
        }}>
        <PencilIcon /> Rename
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename storefront</DialogTitle>
            <DialogDescription>
              The name shown in the storefront switcher and on every page. Its keys, stores and settings stay as they are.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (ready && !pending) submit();
            }}>
            <Label htmlFor="storefront-name">Name</Label>
            <Input id="storefront-name" value={name} maxLength={100} autoFocus onChange={(e) => setName(e.target.value)} />
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!ready || pending}>
              {pending && <Spinner />} Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
