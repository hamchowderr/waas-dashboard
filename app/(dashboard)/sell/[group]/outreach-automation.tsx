"use client";

import * as React from "react";
import { CheckIcon, ExternalLinkIcon, MailIcon, RotateCwIcon, WorkflowIcon } from "lucide-react";

import type { ProspectAutomation, ProspectAutomations, ProspectMailbox } from "@/lib/api/types";
import { outreachEmails, type KitContext, type Step } from "@/lib/sales-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { addOutreachAutomation, prospectAutomations, prospectMailbox } from "../actions";
import { MailboxConnect } from "../crm-connect";

/** "Send these emails from FluentCRM": the group's plan as a draft automation on the storefront. */
export function OutreachAutomation({ productId, group, steps, ctx }: { productId: string; group: string; steps: Step[]; ctx: KitContext }) {
  const [automations, setAutomations] = React.useState<ProspectAutomations | null>(null);
  const [mailbox, setMailbox] = React.useState<ProspectMailbox | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mailboxOpen, setMailboxOpen] = React.useState(false);
  const [adding, start] = React.useTransition();
  const { input, blanks } = outreachEmails(group, steps, ctx);
  const mine: ProspectAutomation | undefined = automations?.automations.find((a) => a.group === group);
  const state = mine?.state ?? null;

  React.useEffect(() => {
    let live = true;
    Promise.all([prospectAutomations(productId), prospectMailbox(productId)]).then(([a, m]) => {
      if (!live) return;
      setAutomations(a);
      setMailbox(m);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [productId]);

  // While the storefront builds it, check back every few seconds.
  React.useEffect(() => {
    if (state !== "adding") return;
    const timer = window.setInterval(() => {
      prospectAutomations(productId).then((a) => a && setAutomations(a));
    }, 3000);
    return () => window.clearInterval(timer);
  }, [state, productId]);

  const onMailbox = React.useCallback((m: ProspectMailbox) => setMailbox(m), []);

  // Only storefronts with their own FluentCRM can have one.
  if (!loaded || !automations || automations.unavailable || !input.emails.length) return null;

  const add = () => {
    setError(null);
    start(async () => {
      const res = await addOutreachAutomation(productId, input);
      if (!res.ok) return setError(res.error);
      setAutomations(res.automations);
    });
  };
  const connected = mailbox?.state === "connected";
  const daily = mailbox?.mailbox?.daily ?? 30;
  const perDay = Math.max(1, Math.floor(daily / 5));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WorkflowIcon className="text-muted-foreground size-4" aria-hidden />
          Send these emails from FluentCRM
        </CardTitle>
        <CardDescription>
          Adds the {input.emails.length} emails above to your storefront&apos;s FluentCRM as a draft automation, &ldquo;Outreach: {group}&rdquo;. Nothing is sent until you turn it on.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <ul className="text-muted-foreground space-y-1.5">
          <li>Businesses you add from the prospect finder for this group get it, on the same days as the plan.</li>
          <li>
            It starts {perDay} new {perDay === 1 ? "business" : "businesses"} a day, a fifth of your mailbox&apos;s daily limit of {daily}, so every email fits under the limit.
          </li>
          <li>When someone replies, tag them Replied (or Customer once they buy) in FluentCRM and their emails stop.</li>
          {blanks.length > 0 && (
            <li>
              Fill in {blanks.map((b, i) => (
                <React.Fragment key={b}>
                  {i > 0 && (i === blanks.length - 1 ? " and " : ", ")}
                  <span className="text-foreground rounded border border-dashed px-1 font-mono text-xs">[{b}]</span>
                </React.Fragment>
              ))}{" "}
              in each email in FluentCRM before you turn it on.
            </li>
          )}
        </ul>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2.5">
          <MailIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1">
            {connected ? (
              <>
                Sends from <span className="font-medium">{mailbox?.mailbox?.from}</span>.
              </>
            ) : (
              "Connect your own mailbox first. Without it, these emails aren't sent."
            )}
          </p>
          <Button variant="outline" size="sm" onClick={() => setMailboxOpen(true)}>
            {connected ? "Change" : "Connect your mailbox"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {state === "added" ? (
            <>
              <p className="flex items-center gap-1.5 font-medium">
                <CheckIcon className="text-foreground/70 size-4" aria-hidden />
                Added as a draft
              </p>
              {mine?.editUrl && (
                <Button size="sm" asChild>
                  <a href={mine.editUrl} target="_blank" rel="noreferrer">
                    Open in FluentCRM
                    <ExternalLinkIcon data-icon="inline-end" />
                  </a>
                </Button>
              )}
            </>
          ) : state === "adding" ? (
            <p className="text-muted-foreground flex items-center gap-2">
              <Spinner className="size-4" />
              Adding it to your storefront&apos;s FluentCRM&hellip;
            </p>
          ) : (
            <Button size="sm" onClick={add} disabled={adding}>
              {adding ? <Spinner data-icon="inline-start" /> : state === "failed" ? <RotateCwIcon data-icon="inline-start" /> : <WorkflowIcon data-icon="inline-start" />}
              {state === "failed" ? "Try again" : "Add to FluentCRM as a draft"}
            </Button>
          )}
        </div>
        {(error || (state === "failed" && mine?.error)) && <p className="text-destructive">{error ?? mine?.error}</p>}
      </CardContent>
      <MailboxConnect productId={productId} open={mailboxOpen} onOpenChange={setMailboxOpen} mailbox={mailbox} onChange={onMailbox} />
    </Card>
  );
}
