"use client";

import * as React from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import type { DomainSetup } from "@/lib/api/types";
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
import { Spinner } from "@/components/ui/spinner";
import { getDomainSetup } from "../../actions";
import { CopyButton } from "./mail-sender";

/** Whether a custom domain reaches the store yet. */
function PointsBadge({ pointsHere }: { pointsHere: boolean }) {
  return pointsHere ? <Badge variant="success">Connected</Badge> : <Badge variant="warning">DNS needed</Badge>;
}

/**
 * The records a custom domain needs at its DNS host, the one-click button when the host has it,
 * and what the domain points at now.
 */
export function DomainRecords({ setup }: { setup: DomainSetup }) {
  const { connect } = setup;
  const oneClick = connect?.supported && connect.url?.startsWith("https://") ? connect.url : null;
  return (
    <div className="space-y-3 text-sm" data-testid="domain-setup">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium break-all">{setup.domainName}</div>
          {setup.dnsHost && (
            <div className="text-muted-foreground text-xs" title={setup.dnsHost.nameservers.join(", ")}>
              DNS at {setup.dnsHost.name}
            </div>
          )}
        </div>
        <PointsBadge pointsHere={setup.pointsHere} />
      </div>
      {setup.pointsHere ? (
        <p className="text-muted-foreground">This domain already points at the store. Nothing else to add.</p>
      ) : (
        <>
          {oneClick && (
            <div className="space-y-1.5">
              <Button asChild size="sm">
                <a href={oneClick} target="_blank" rel="noopener noreferrer">
                  Connect automatically at {connect?.dnsProvider ?? "the DNS host"}
                  <ExternalLink />
                </a>
              </Button>
              <p className="text-muted-foreground text-xs">
                Opens {connect?.dnsProvider ?? "the DNS host"}, which adds the records below once you approve. Or add
                them by hand.
              </p>
            </div>
          )}
          {connect?.conflict && (
            <p className="rounded-md border border-orange-400 bg-orange-50 p-2.5 text-orange-800 dark:bg-orange-900/70 dark:text-white/80">
              <span className="font-medium">One-click setup is off for this domain.</span> {connect.conflict}
            </p>
          )}
          <p className="text-muted-foreground">
            {oneClick ? "To add them by hand, open" : "Open"} the DNS settings{" "}
            {setup.dnsHost ? `at ${setup.dnsHost.name}` : "where the domain was bought"} and add these records. Delete any
            other A or AAAA records with the same name.
          </p>
        </>
      )}
      <div className="space-y-2">
        {setup.records.map((record) => (
          <div key={`${record.type}-${record.value}`} className="space-y-1 rounded-md border p-2.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{record.type}</Badge>
              <span className="text-muted-foreground text-xs">Name</span>
              <span className="min-w-0 flex-1 font-mono text-xs break-all">{record.name}</span>
              <CopyButton value={record.name} label={`${record.type} name`} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Value</span>
              <span className="min-w-0 flex-1 font-mono text-xs break-all">{record.value}</span>
              <CopyButton value={record.value} label={`${record.type} value`} />
            </div>
          </div>
        ))}
      </div>
      {!setup.pointsHere && (
        <p className="text-muted-foreground text-xs">
          {setup.currentAddresses.length
            ? `Right now it points at ${setup.currentAddresses.join(", ")}. `
            : "Right now it has no address. "}
          New records usually work within minutes, sometimes up to an hour.
        </p>
      )}
    </div>
  );
}

/** Looks a domain up again; returns the new setup, or null after showing why it couldn't. */
export function useDomainCheck(tenantId: string) {
  const [checking, startCheck] = React.useTransition();
  const check = React.useCallback(
    (domainName: string, done: (setup: DomainSetup) => void) =>
      startCheck(async () => {
        const result = await getDomainSetup(tenantId, domainName);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        done(result.data);
      }),
    [tenantId]
  );
  return { checking, check };
}

/** "DNS records" on one of the store's custom domains: what it needs, and a check that it has it. */
export function DomainDnsButton({ tenantId, initial }: { tenantId: string; initial: DomainSetup }) {
  const [open, setOpen] = React.useState(false);
  const [setup, setSetup] = React.useState(initial);
  const { checking, check } = useDomainCheck(tenantId);

  return (
    <>
      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setOpen(true)}>
        <PointsBadge pointsHere={setup.pointsHere} />
        <span className="sr-only">DNS records for {setup.domainName}</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>DNS records</DialogTitle>
            <DialogDescription>What {setup.domainName} needs to reach the store.</DialogDescription>
          </DialogHeader>
          <DomainRecords setup={setup} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            {!setup.pointsHere && (
              <Button disabled={checking} onClick={() => check(setup.domainName, setSetup)}>
                {checking ? <Spinner /> : <RefreshCw />}
                Check again
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
