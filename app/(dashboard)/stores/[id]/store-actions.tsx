"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EllipsisIcon, MailIcon, PauseIcon, PlayIcon, ScrollTextIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
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
import { EmailOwner } from "./email-owner";

type Dialogs = "email" | "suspend" | "delete" | null;

/**
 * The store's less common actions in one menu beside Visit site and Log in: email the owner, its API log, and for
 * the platform admin suspend or resume and delete (last, after a line). A seller's stores normally follow their
 * shop's subscriptions; suspend and delete are for test stores and the odd store that needs a hand.
 */
export function StoreActions({
  tenantId,
  storeName,
  storesHref,
  apiLogHref,
  owner,
  manage
}: {
  tenantId: string;
  storeName: string;
  /** The Stores list to go back to after a delete, in the store's own storefront. */
  storesHref: string;
  apiLogHref: string;
  /** Set when the person may email the owner their sign-in link. */
  owner: { lastSentAt: string | null; lastSentTo: string | null; ownerEmail: string | null } | null;
  /** Set for the platform admin. canSuspend is false for a failed store, which can only be deleted until it's fixed. */
  manage: { isSuspended: boolean; canSuspend: boolean } | null;
}) {
  const [dialog, setDialog] = React.useState<Dialogs>(null);
  const resume = useResume(tenantId, storeName);
  const onOpenChange = (open: boolean) => !open && setDialog(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon-sm" aria-label="More actions">
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          {owner && (
            <DropdownMenuItem onSelect={() => setDialog("email")}>
              <MailIcon />
              Email the owner
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={apiLogHref}>
              <ScrollTextIcon />
              API log
            </Link>
          </DropdownMenuItem>
          {manage && (
            <>
              <DropdownMenuSeparator />
              {manage.canSuspend &&
                (manage.isSuspended ? (
                  <DropdownMenuItem disabled={resume.pending} onSelect={resume.run}>
                    <PlayIcon />
                    Resume store
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => setDialog("suspend")}>
                    <PauseIcon />
                    Suspend store
                  </DropdownMenuItem>
                ))}
              <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
                <Trash2Icon />
                Delete store
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {owner && (
        <EmailOwner open={dialog === "email"} onOpenChange={onOpenChange} tenantId={tenantId} storeName={storeName} {...owner} />
      )}
      {manage && (
        <>
          <SuspendStore open={dialog === "suspend"} onOpenChange={onOpenChange} tenantId={tenantId} storeName={storeName} />
          <DeleteStore open={dialog === "delete"} onOpenChange={onOpenChange} tenantId={tenantId} storeName={storeName} storesHref={storesHref} />
        </>
      )}
    </>
  );
}

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void; tenantId: string; storeName: string };

function SuspendStore({ open, onOpenChange: setOpen, tenantId, storeName }: DialogProps) {
  const router = useRouter();
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
  );
}

/** Resume has nothing to confirm: it runs straight from the menu. */
function useResume(tenantId: string, storeName: string) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const run = () =>
    startTransition(async () => {
      const result = await resumeStore(tenantId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Resuming ${storeName}. It shows Ready when it's back online.`);
      router.refresh();
    });
  return { pending, run };
}

function DeleteStore({ open, onOpenChange: setOpen, tenantId, storeName, storesHref }: DialogProps & { storesHref: string }) {
  const router = useRouter();
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
      router.push(storesHref);
    });

  return (
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
  );
}
