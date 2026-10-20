"use client";

import * as React from "react";
import { Check, Copy, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="bg-muted flex items-center gap-2 rounded-md border px-3 py-1.5">
        <code className="min-w-0 flex-1 font-mono text-sm break-all">
          {value}
        </code>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check /> : <Copy />}
          <span className="sr-only">Copy {label}</span>
        </Button>
      </div>
    </div>
  );
}

/**
 * Shows a new key and its secret, once. The secret lives only in this dialog's props: closing it
 * drops the only copy, and the API can't show it again.
 */
export function SecretDialog({
  secret,
  onClose,
}: {
  /** The key to show; null keeps the dialog closed. */
  secret: {
    title: string;
    keyId: string;
    secret: string;
    note?: string;
    /** Where the key goes; by default, the storefront's connection settings. */
    usage?: string;
  } | null;
  onClose: () => void;
}) {
  const [confirmed, setConfirmed] = React.useState(false);

  return (
    // Only the Done button closes it, so the secret isn't lost to a stray click outside.
    <Dialog open={secret !== null} onOpenChange={() => undefined}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{secret?.title}</DialogTitle>
          <DialogDescription>
            {secret?.usage ??
              "Enter these in WaaS → Settings → Connection on the storefront, or wherever the key is used."}
          </DialogDescription>
        </DialogHeader>
        {secret && (
          <div className="space-y-4">
            <CopyField label="API key" value={secret.keyId} />
            <CopyField label="API secret" value={secret.secret} />
            <p className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <span>
                The secret is shown this once. It isn&apos;t stored anywhere, so
                copy it now. If it&apos;s lost, rotate the key.
                {secret.note && <> {secret.note}</>}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="copied-secret"
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
              />
              <Label htmlFor="copied-secret">I&apos;ve copied the secret</Label>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            disabled={!confirmed}
            onClick={() => {
              setConfirmed(false);
              onClose();
            }}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
