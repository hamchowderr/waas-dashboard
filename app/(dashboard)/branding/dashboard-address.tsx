"use client";

import * as React from "react";
import { Check, Copy, ExternalLinkIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import type { DashboardDomainView } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { checkDashboardDomain, removeDashboardDomain, setDashboardDomain } from "../actions";

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}>
      {copied ? <Check /> : <Copy />}
      <span className="sr-only">Copy</span>
    </Button>
  );
}

/** The storefront's own address for this dashboard, with the DNS records still to add. */
export function DashboardAddress({ productId, initial, canEdit }: { productId: string; initial: DashboardDomainView; canEdit: boolean }) {
  const [view, setView] = React.useState(initial);
  const [domain, setDomain] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [confirming, setConfirming] = React.useState(false);
  const current = view.dashboardDomain;

  const act = (work: () => Promise<{ ok: true; data: DashboardDomainView } | { ok: false; error: string }>, done?: string) =>
    startTransition(async () => {
      const result = await work();
      if (!result.ok) return void toast.error(result.error);
      setView(result.data);
      if (done) toast.success(done);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your own dashboard address</CardTitle>
        <CardDescription>
          Your team signs in at an address on your own domain, like dashboard.yourbusiness.com, instead of ours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {current ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium break-all">{current.domain}</span>
              {current.status === "active" ? <Badge variant="success">Live</Badge> : <Badge variant="warning">Waiting for DNS</Badge>}
              {current.status === "active" && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={`https://${current.domain}`} target="_blank" rel="noreferrer">
                    <ExternalLinkIcon />
                    Open
                  </a>
                </Button>
              )}
            </div>
            {current.records.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm">
                  Add {current.records.length === 1 ? "this record" : "these records"} where your domain&apos;s DNS is managed
                  (for example Cloudflare, GoDaddy or Namecheap), then choose Check again. Most DNS hosts want only the first
                  part of the name, like <span className="font-mono">dashboard</span>.
                </p>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {current.records.map((r) => (
                        <TableRow key={`${r.type}-${r.name}`}>
                          <TableCell className="font-mono">{r.type}</TableCell>
                          <TableCell className="font-mono break-all whitespace-normal">
                            {r.name}
                            <CopyValue value={r.name} />
                          </TableCell>
                          <TableCell className="font-mono break-all whitespace-normal">
                            {r.value}
                            <CopyValue value={r.value} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-muted-foreground text-xs">DNS changes can take up to a few hours. We also check every night.</p>
              </div>
            )}
            {current.error && <p className="text-destructive text-sm">{current.error}</p>}
            {current.checkedAt && <p className="text-muted-foreground text-xs">Last checked {formatDateTime(current.checkedAt)}</p>}
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                {current.status !== "active" && (
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => checkDashboardDomain(productId))}>
                    {pending ? <Spinner /> : <RefreshCwIcon />}
                    Check again
                  </Button>
                )}
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(true)}>
                  <Trash2Icon />
                  Stop using it
                </Button>
              </div>
            )}
            <ConfirmAction
              open={confirming}
              onOpenChange={setConfirming}
              title="Stop using this address?"
              description={`Your team signs in at our address again. ${current.domain} stops showing the dashboard; you can remove its DNS record afterwards.`}
              confirmLabel="Stop using it"
              destructive
              onConfirm={async () => {
                const result = await removeDashboardDomain(productId);
                if (!result.ok) {
                  toast.error(result.error);
                  return false;
                }
                setView(result.data);
                return true;
              }}
            />
          </>
        ) : canEdit ? (
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              act(() => setDashboardDomain(productId, domain), "Address added");
            }}>
            <div className="flex-1 space-y-2">
              <Label htmlFor="dashboard-domain">Address</Label>
              <Input id="dashboard-domain" placeholder="dashboard.yourbusiness.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
            </div>
            <Button type="submit" size="sm" disabled={!domain.trim() || pending}>
              {pending && <Spinner />}
              Add address
            </Button>
          </form>
        ) : (
          <p className="text-muted-foreground text-sm">No own address yet. An owner or admin can add one.</p>
        )}
      </CardContent>
    </Card>
  );
}
