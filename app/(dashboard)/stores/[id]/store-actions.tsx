"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { deleteStore, resumeStore, suspendStore } from "../../actions";

/**
 * Suspend or resume, and delete, for the platform admin. A seller's stores normally follow their
 * shop's subscriptions; these are for test stores and the odd store that needs a hand.
 */
export function StoreActions({
  tenantId,
  storeName,
  isSuspended,
  canSuspend
}: {
  tenantId: string;
  storeName: string;
  isSuspended: boolean;
  /** False for a failed store, which can only be deleted until it's fixed. */
  canSuspend: boolean;
}) {
  return (
    <>
      {canSuspend &&
        (isSuspended ? (
          <ResumeStore tenantId={tenantId} storeName={storeName} />
        ) : (
          <SuspendStore tenantId={tenantId} storeName={storeName} />
        ))}
      <DeleteStore tenantId={tenantId} storeName={storeName} />
    </>
  );
}

function SuspendStore({ tenantId, storeName }: { tenantId: string; storeName: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [takeBackup, setTakeBackup] = React.useState(true);
  const [pending, startTransition] = React.useTransition();

  const submit = () =>
    startTransition(async () => {
      const result = await suspendStore(tenantId, takeBackup);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Suspending ${storeName}. It shows Ready when it's offline.`);
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Suspend
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Suspend this store?</DialogTitle>
            <DialogDescription>
              {storeName} goes offline and visitors see a &quot;website unavailable&quot; page. Nothing is deleted, and you can
              resume it at any time. Its shop isn&apos;t told, so a paid subscription keeps renewing.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2">
            <Checkbox
              id="suspend-backup"
              checked={takeBackup}
              disabled={pending}
              onCheckedChange={(checked) => setTakeBackup(checked === true)}
            />
            <Label htmlFor="suspend-backup" className="leading-snug font-normal">
              Back up the store first
            </Label>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={pending} onClick={submit}>
              {pending && <Spinner />}
              Suspend store
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResumeStore({ tenantId, storeName }: { tenantId: string; storeName: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const submit = () =>
    startTransition(async () => {
      const result = await resumeStore(tenantId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Resuming ${storeName}. It shows Ready when it's back online.`);
      router.refresh();
    });

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={submit}>
      {pending && <Spinner />}
      Resume
    </Button>
  );
}

function DeleteStore({ tenantId, storeName }: { tenantId: string; storeName: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const confirmed = typed.trim() === storeName;

  const submit = () =>
    startTransition(async () => {
      const result = await deleteStore(tenantId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleting ${storeName}. Its backups are kept on the Backups page.`);
      setOpen(false);
      router.push("/stores");
    });

  return (
    <>
      <Button variant="outline" size="sm" className="text-destructive" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
          setTyped("");
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete this store?</DialogTitle>
            <DialogDescription>
              {storeName} and its address go away for good. Its backups are kept for a while on the Backups page, so it can
              still be brought back. Its shop isn&apos;t told, so cancel a paid subscription there too.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-store-name">Type the store&apos;s name to confirm</Label>
            <Input
              id="delete-store-name"
              value={typed}
              placeholder={storeName}
              autoComplete="off"
              disabled={pending}
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={pending || !confirmed} onClick={submit}>
              {pending && <Spinner />}
              Delete store
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
