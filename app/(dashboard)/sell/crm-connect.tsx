"use client";

import * as React from "react";

import type { ProspectCrm } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { saveHighLevelWebhook } from "./actions";

/** Pasting (or removing) the HighLevel workflow webhook that prospects are posted to. */
export function HighLevelConnect({
  productId,
  open,
  onOpenChange,
  connected,
  onSaved
}: {
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connected: boolean;
  onSaved: (crm: ProspectCrm) => void;
}) {
  const [webhook, setWebhook] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, start] = React.useTransition();

  const save = (value: string | null) => {
    setError(null);
    start(async () => {
      const res = await saveHighLevelWebhook(productId, value);
      if (!res.ok) return setError(res.error);
      setWebhook("");
      onSaved(res.crm);
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{connected ? "HighLevel is connected" : "Connect HighLevel"}</DialogTitle>
          <DialogDescription>
            Prospects you add go into your HighLevel sub-account as contacts, tagged &quot;Prospect&quot;. Your HighLevel workflows send any emails or texts from your own HighLevel setup.
          </DialogDescription>
        </DialogHeader>
        <ol className="text-muted-foreground list-decimal space-y-1 pl-5 text-sm">
          <li>In HighLevel, open Automation and make a workflow (or use the Prospects workflow from your snapshot).</li>
          <li>Add the &quot;Inbound Webhook&quot; trigger and copy its address.</li>
          <li>Paste it here. Then add one prospect and use it as the trigger&apos;s sample, so you can map the fields.</li>
        </ol>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            save(webhook);
          }}
        >
          <Label htmlFor="hl-webhook">{connected ? "New webhook address" : "Webhook address"}</Label>
          <Input
            id="hl-webhook"
            value={webhook}
            onChange={(e) => setWebhook(e.target.value)}
            placeholder="https://services.leadconnectorhq.com/hooks/…"
            autoComplete="off"
            maxLength={2000}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter className="gap-2 pt-2 sm:justify-between">
            {connected ? (
              <Button type="button" variant="ghost" disabled={saving} onClick={() => save(null)}>
                Disconnect
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={saving || !webhook.trim()}>
              {saving && <Spinner data-icon="inline-start" />}
              {connected ? "Replace" : "Connect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
