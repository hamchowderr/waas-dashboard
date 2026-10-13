"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { formatDateTime } from "@/lib/format";
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
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { restoreBackup } from "../../actions";

/**
 * Rolls the live store back to one of its backups, in place. By default what the store holds now
 * is backed up first, so restoring the wrong backup can be undone.
 */
export function RestoreBackup({
  tenantId,
  storeName,
  backupId,
  takenAt
}: {
  tenantId: string;
  storeName: string;
  backupId: string;
  takenAt: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [takeBackup, setTakeBackup] = React.useState(true);
  const [pending, startTransition] = React.useTransition();
  const when = formatDateTime(takenAt);

  const submit = () =>
    startTransition(async () => {
      const result = await restoreBackup(tenantId, backupId, takeBackup);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Restoring ${storeName} to ${when}. It shows Ready when it's done.`);
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Restore
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Restore this backup?</DialogTitle>
            <DialogDescription>
              {storeName} goes back to how it was on {when}: its files, uploads, orders, customers and settings.
              Anything that changed since then is replaced. Its address, version and email sender stay as they are.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2">
            <Checkbox
              id={`take-backup-${backupId}`}
              checked={takeBackup}
              disabled={pending}
              onCheckedChange={(checked) => setTakeBackup(checked === true)}
            />
            <Label htmlFor={`take-backup-${backupId}`} className="leading-snug font-normal">
              Back up the store as it is now first, so this can be undone
            </Label>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={pending} onClick={submit}>
              {pending && <Spinner />}
              Restore store
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
