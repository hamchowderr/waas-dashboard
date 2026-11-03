"use client";

import * as React from "react";

import type { ProspectCrm, ProspectMailbox, ProspectMailboxInput } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { prospectMailbox, saveHighLevelWebhook, saveMailbox } from "./actions";

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

/** Common mailboxes: where their mail server is, and where to make the app password. */
const PRESETS = {
  google: {
    label: "Gmail or Google Workspace",
    short: "Google",
    host: "smtp.gmail.com",
    port: 587,
    help: "Turn on 2-Step Verification for the account, then make an app password at myaccount.google.com/apppasswords.",
    helpUrl: "https://myaccount.google.com/apppasswords"
  },
  microsoft: {
    label: "Microsoft 365",
    short: "Microsoft",
    host: "smtp.office365.com",
    port: 587,
    help: "Your Microsoft 365 admin must allow \"Authenticated SMTP\" for this mailbox. Use the mailbox password, or an app password if it has 2-step sign-in.",
    helpUrl: "https://learn.microsoft.com/exchange/clients-and-mobile-in-exchange-online/authenticated-client-smtp-submission"
  },
  zoho: {
    label: "Zoho Mail",
    short: "Zoho",
    host: "smtp.zoho.com",
    port: 587,
    help: "Make an app password in Zoho Mail under My Account, Security, App Passwords.",
    helpUrl: "https://accounts.zoho.com/home#security/app_password"
  },
  other: { label: "Another mailbox", short: "Other", host: "", port: 587, help: "Use the SMTP settings your email provider gives you.", helpUrl: null }
} as const;
type Preset = keyof typeof PRESETS;
const presetOf = (host: string): Preset => (Object.keys(PRESETS) as Preset[]).find((k) => k !== "other" && PRESETS[k].host === host) ?? "other";

/**
 * The seller's own mailbox for emails to prospects. Store email can't be used for cold outreach, so FluentCRM sends an
 * email to a "Prospect" only through this mailbox, one at a time and up to the daily limit.
 */
export function MailboxConnect({
  productId,
  open,
  onOpenChange,
  mailbox,
  onChange
}: {
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mailbox: ProspectMailbox | null;
  onChange: (mailbox: ProspectMailbox) => void;
}) {
  const saved = mailbox?.mailbox ?? null;
  const [preset, setPreset] = React.useState<Preset>(saved ? presetOf(saved.host) : "google");
  const [form, setForm] = React.useState<ProspectMailboxInput>(() => ({
    host: saved?.host ?? PRESETS.google.host,
    port: saved?.port ?? 587,
    user: saved?.user ?? "",
    pass: "",
    from: saved?.from ?? "",
    name: saved?.name ?? "",
    daily: saved?.daily ?? 30
  }));
  const [error, setError] = React.useState<string | null>(null);
  const [saving, start] = React.useTransition();
  const state = mailbox?.state ?? "none";
  const busy = state === "checking" || state === "removing";

  // While the storefront signs in, check back every few seconds.
  React.useEffect(() => {
    if (!open || !busy) return;
    const timer = window.setInterval(() => {
      prospectMailbox(productId).then((m) => m && onChange(m));
    }, 3000);
    return () => window.clearInterval(timer);
  }, [open, busy, productId, onChange]);

  const set = <K extends keyof ProspectMailboxInput>(key: K, value: ProspectMailboxInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const choose = (value: string) => {
    if (!value) return;
    const p = value as Preset;
    setPreset(p);
    setForm((f) => ({ ...f, host: PRESETS[p].host || (presetOf(f.host) === "other" ? f.host : ""), port: PRESETS[p].port }));
  };
  const save = (input: ProspectMailboxInput | null) => {
    setError(null);
    start(async () => {
      const res = await saveMailbox(productId, input);
      if (!res.ok) return setError(res.error);
      set("pass", "");
      onChange(res.mailbox);
    });
  };
  const info = PRESETS[preset];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{state === "connected" ? "Your mailbox is connected" : "Connect your mailbox"}</DialogTitle>
          <DialogDescription>
            Emails from your FluentCRM to prospects go out from your own mailbox, one at a time, up to your daily limit. Without one they aren&apos;t sent. Your store&apos;s receipts and other emails don&apos;t change.
          </DialogDescription>
        </DialogHeader>

        <MailboxStatus mailbox={mailbox} />

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save(form);
          }}
        >
          <ToggleGroup type="single" variant="outline" size="sm" value={preset} onValueChange={choose} aria-label="Your email provider" className="flex w-full flex-wrap">
            {(Object.keys(PRESETS) as Preset[]).map((k) => (
              <ToggleGroupItem key={k} value={k} className="flex-1 px-3" aria-label={PRESETS[k].label}>
                {PRESETS[k].short}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="text-muted-foreground text-xs">
            {info.help}{" "}
            {info.helpUrl && (
              <a href={info.helpUrl} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-2">
                How
              </a>
            )}
          </p>

          {preset === "other" && (
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mb-host">Mail server (SMTP)</Label>
                <Input id="mb-host" value={form.host} onChange={(e) => set("host", e.target.value)} placeholder="smtp.example.com" autoComplete="off" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mb-port">Port</Label>
                <Input id="mb-port" inputMode="numeric" value={String(form.port)} onChange={(e) => set("port", Number(e.target.value.replace(/\D/g, "")) || 0)} />
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mb-user">Email address</Label>
              <Input id="mb-user" type="email" value={form.user} onChange={(e) => set("user", e.target.value)} placeholder="you@yourbusiness.com" autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mb-pass">App password</Label>
              <Input
                id="mb-pass"
                type="password"
                value={form.pass}
                onChange={(e) => set("pass", e.target.value)}
                placeholder={saved ? "Enter it again to save" : "xxxx xxxx xxxx xxxx"}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mb-name">Sender name</Label>
              <Input id="mb-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Sam at Summit Sites" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mb-daily">Most emails a day</Label>
              <Input
                id="mb-daily"
                inputMode="numeric"
                value={String(form.daily)}
                onChange={(e) => set("daily", Number(e.target.value.replace(/\D/g, "")) || 0)}
                aria-describedby="mb-daily-help"
              />
            </div>
          </div>
          <p id="mb-daily-help" className="text-muted-foreground text-xs">
            Start low (20 to 30 a day) so your mailbox keeps a good name with Gmail and Outlook. Up to 200.
          </p>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter className="gap-2 pt-1 sm:justify-between">
            {saved ? (
              <Button type="button" variant="ghost" disabled={saving || busy} onClick={() => save(null)}>
                Disconnect
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={saving || busy || !form.host.trim() || !form.user.trim() || !form.pass}>
              {(saving || state === "checking") && <Spinner data-icon="inline-start" />}
              {state === "checking" ? "Checking…" : saved ? "Save and check" : "Connect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MailboxStatus({ mailbox }: { mailbox: ProspectMailbox | null }) {
  if (!mailbox || mailbox.state === "none") return null;
  const box = mailbox.mailbox;
  const tone =
    mailbox.state === "failed" ? "border-destructive/40 bg-destructive/5" : mailbox.state === "connected" ? "border-border bg-muted/50" : "border-border bg-muted/30";
  return (
    <div role="status" className={`rounded-lg border px-3 py-2 text-sm ${tone}`}>
      {mailbox.state === "checking" && (
        <p className="flex items-center gap-2">
          <Spinner /> Signing in to {box?.user ?? "your mailbox"} from your storefront…
        </p>
      )}
      {mailbox.state === "removing" && (
        <p className="flex items-center gap-2">
          <Spinner /> Disconnecting…
        </p>
      )}
      {mailbox.state === "connected" && box && (
        <p>
          Prospect emails go out from <span className="font-medium">{box.name ? `${box.name} <${box.from}>` : box.from}</span>, up to {box.daily} a day.
        </p>
      )}
      {mailbox.state === "failed" && (
        <>
          <p className="font-medium">{box ? `Couldn't sign in to ${box.user}.` : "Couldn't disconnect it. Try again."}</p>
          {mailbox.error && <p className="text-muted-foreground mt-0.5 text-xs break-words">{mailbox.error}</p>}
        </>
      )}
    </div>
  );
}
