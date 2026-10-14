"use client";

import * as React from "react";
import { toast } from "sonner";

import type { WebhookEventType, WebhookSecret } from "@/lib/api/types";
import { webhookEventLabels } from "@/lib/format";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { createWebhook } from "../actions";

/** The events an endpoint can ask for. The test event always reaches the endpoint it is sent to. */
const eventChoices = (Object.entries(webhookEventLabels) as [WebhookEventType, string][]).filter(
  ([type]) => type !== "webhook.test"
);

/** Adds an endpoint to a storefront; onCreated gets its secret, to show once. */
export function AddEndpointDialog({
  open,
  onOpenChange,
  storefronts,
  defaultProductId,
  onCreated
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storefronts: { id: string; name: string }[];
  defaultProductId?: string;
  onCreated: (created: WebhookSecret) => void;
}) {
  const [productId, setProductId] = React.useState(
    () => storefronts.find((s) => s.id === defaultProductId)?.id ?? (storefronts.length === 1 ? storefronts[0].id : "")
  );
  const [url, setUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [events, setEvents] = React.useState<WebhookEventType[]>([]);
  const [pending, startTransition] = React.useTransition();

  const urlError = url && !/^https?:\/\/\S+$/i.test(url.trim()) ? "Start the URL with https://" : null;
  const ready = productId && url.trim() && !urlError;

  const toggle = (type: WebhookEventType, on: boolean) =>
    setEvents((current) => (on ? [...current, type] : current.filter((t) => t !== type)));

  const submit = () =>
    startTransition(async () => {
      const result = await createWebhook(productId, { url: url.trim(), description: description.trim() || null, eventTypes: events });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setUrl("");
      setDescription("");
      setEvents([]);
      onOpenChange(false);
      onCreated(result.data);
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a webhook endpoint</DialogTitle>
          <DialogDescription>
            The address gets a signed POST for each event on the storefront you choose.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-storefront">Storefront</Label>
            <Select value={productId} onValueChange={setProductId} disabled={pending}>
              <SelectTrigger id="webhook-storefront" className="w-full">
                <SelectValue placeholder="Choose a storefront" />
              </SelectTrigger>
              <SelectContent>
                {storefronts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook-url">URL</Label>
            <Input
              id="webhook-url"
              type="url"
              value={url}
              placeholder="https://example.com/webhooks"
              maxLength={2000}
              disabled={pending}
              aria-invalid={!!urlError}
              onChange={(event) => setUrl(event.target.value)}
            />
            {urlError && <p className="text-destructive text-xs">{urlError}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook-description">Description (optional)</Label>
            <Input
              id="webhook-description"
              value={description}
              placeholder="e.g. Failure alerts"
              maxLength={200}
              disabled={pending}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Events</legend>
            <p className="text-muted-foreground text-xs">Tick none to get every event.</p>
            <div className="grid gap-2 pt-1 sm:grid-cols-2">
              {eventChoices.map(([type, label]) => (
                <div key={type} className="flex items-center gap-2">
                  <Checkbox
                    id={`webhook-event-${type}`}
                    checked={events.includes(type)}
                    disabled={pending}
                    onCheckedChange={(checked) => toggle(type, checked === true)}
                  />
                  <Label htmlFor={`webhook-event-${type}`} className="font-normal" title={type}>
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </fieldset>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!ready || pending} onClick={submit}>
            {pending && <Spinner />}
            Add endpoint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
