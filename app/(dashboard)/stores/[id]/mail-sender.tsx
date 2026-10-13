"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import type { MailDomain } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
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
import { removeMailDomain, setMailDomain } from "../../actions";

const STATUS = {
  pending: { label: "Waiting for DNS", variant: "warning" },
  verified: { label: "Sending", variant: "success" },
  removing: { label: "Removing", variant: "outline" }
} as const;

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 shrink-0"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}>
      {copied ? <Check /> : <Copy />}
      <span className="sr-only">Copy {label}</span>
    </Button>
  );
}

/** Which address the store's email comes from, and the DNS records its own domain needs. */
export function MailSender({ tenantId, mailDomain }: { tenantId: string; mailDomain: MailDomain | null }) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [domain, setDomain] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const add = () =>
    startTransition(async () => {
      const result = await setMailDomain(tenantId, domain);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Added ${result.data.domainName}. Add its DNS records next.`);
      setDomain("");
      setAdding(false);
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      const result = await removeMailDomain(tenantId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("The store moves back to the platform's address within 10 minutes.");
      setRemoving(false);
      router.refresh();
    });

  if (!mailDomain) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Sends from the platform&apos;s address. With its own domain, the store&apos;s receipts and password resets come
          from no-reply at that domain.
        </p>
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          Use own domain
        </Button>
        <Dialog open={adding} onOpenChange={(next) => !pending && setAdding(next)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Send from own domain</DialogTitle>
              <DialogDescription>
                You get three DNS records to add at the domain&apos;s DNS host. The store keeps sending from the
                platform&apos;s address until they are verified.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (domain.trim()) add();
              }}>
              <Label htmlFor="mail-domain">Domain</Label>
              <Input
                id="mail-domain"
                value={domain}
                placeholder="shop.example.com"
                disabled={pending}
                autoComplete="off"
                onChange={(event) => setDomain(event.target.value)}
              />
            </form>
            <DialogFooter>
              <Button variant="outline" disabled={pending} onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button disabled={pending || !domain.trim()} onClick={add}>
                {pending && <Spinner />}
                Add domain
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const status = STATUS[mailDomain.status] ?? STATUS.pending;
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 font-medium break-all">no-reply@{mailDomain.domainName}</span>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      {mailDomain.status === "pending" && (
        <p className="text-muted-foreground">
          Add these records at the domain&apos;s DNS host. They are checked every 10 minutes; the store switches over
          on its own once they are found. Until then it sends from the platform&apos;s address.
        </p>
      )}
      {mailDomain.status !== "removing" &&
        (mailDomain.records ? (
          <div className="space-y-2">
            {mailDomain.records.map((record) => (
              <div key={`${record.type}-${record.host}-${record.value}`} className="space-y-1 rounded-md border p-2.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{record.type}</Badge>
                  <span className="min-w-0 flex-1 font-mono text-xs break-all">{record.name}</span>
                  {record.priority !== null && (
                    <span className="text-muted-foreground text-xs">Priority {record.priority}</span>
                  )}
                  <CopyButton value={record.name} label="name" />
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground min-w-0 flex-1 font-mono text-xs break-all">{record.value}</span>
                  <CopyButton value={record.value} label="value" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">The DNS records could not be loaded from toSend. Reload to try again.</p>
        ))}
      {mailDomain.status !== "removing" && (
        <Button variant="outline" size="sm" onClick={() => setRemoving(true)}>
          Stop using this domain
        </Button>
      )}
      <Dialog open={removing} onOpenChange={(next) => !pending && setRemoving(next)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Stop using {mailDomain.domainName}?</DialogTitle>
            <DialogDescription>
              The store goes back to sending from the platform&apos;s address within 10 minutes. The DNS records stay
              where they are; remove them at the DNS host if they are no longer wanted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setRemoving(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={pending} onClick={remove}>
              {pending && <Spinner />}
              Stop using it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
