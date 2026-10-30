import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ExternalLinkIcon } from "lucide-react";

import { canChange, getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { backupReasonLabel, formatBytes, formatDate, formatDateTime, jobTypeLabel, settingLabel } from "@/lib/format";
import { StatusCode } from "@/lib/api/types";
import { OnHoldBadge, StatusBadge, SuspendedBadge } from "@/components/admin/status-badge";
import { JobStateBadge } from "@/components/admin/job-state-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChangeAddress } from "./change-address";
import { GoLive } from "./go-live";
import { MailSender } from "./mail-sender";
import { RestoreBackup } from "./restore-backup";
import { MoveInStatus } from "./move-in";
import { StoreActions } from "./store-actions";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ product?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const tenant = await getAdminApi().tenant((await params).id);
  return { title: tenant?.name ?? "Store" };
}

const tableClass =
  "[&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="min-w-0 text-end break-all">{children}</span>
    </div>
  );
}

export default async function StorePage({ params, searchParams }: Params) {
  const { id } = await params;
  const { product } = await searchParams;
  const [tenant, mailDomain, viewer] = await Promise.all([
    getAdminApi().tenant(id),
    getAdminApi().mailDomain(id).catch(() => null),
    getViewer()
  ]);
  if (!tenant) notFound();
  // The admin works one storefront at a time (?product=); a store page opens in its own storefront, so the
  // sidebar and the way back stay there instead of dropping to the first storefront.
  if (viewer?.isAdmin && product !== tenant.productId) redirect(`/stores/${id}?product=${tenant.productId}`);
  const storesHref = viewer?.isAdmin ? `/stores?product=${tenant.productId}` : "/stores";
  const connect =
    mailDomain?.status === "pending"
      ? await getAdminApi().domainConnect(id, mailDomain.domainName, "email").catch(() => null)
      : null;
  // A store being removed or that failed can't be rolled back until it's fixed.
  const canRestore = tenant.statusCode !== StatusCode.Removing && tenant.statusCode !== StatusCode.Failed;
  // Suspend and delete are the platform admin's; a seller's stores follow their shop's subscriptions.
  const canManage = viewer?.isAdmin === true && tenant.statusCode !== StatusCode.Removing;
  // Going live is the site owner's own step: anyone who can change the storefront may take it.
  const canGoLive = tenant.onHold && !!viewer && canChange(viewer) && canRestore;
  // Links to the site only once it is up.
  // What the store was made with, in plain words; the values themselves stay private.
  const settings = [...new Set([...tenant.wpOptionNames, ...tenant.phpConstantNames].map(settingLabel))];
  const siteUrl = tenant.mainDomain && tenant.statusCode === StatusCode.Done ? `https://${tenant.mainDomain}/` : null;

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="icon">
          <Link href={storesHref}>
            <ChevronLeft />
            <span className="sr-only">Back to stores</span>
          </Link>
        </Button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-bold tracking-tight lg:text-2xl">{tenant.name}</h1>
            <StatusBadge statusCode={tenant.statusCode} />
            {tenant.isSuspended && <SuspendedBadge />}
            {tenant.onHold && <OnHoldBadge />}
          </div>
          <p className="text-muted-foreground truncate text-sm">{tenant.mainDomain ?? "No main domain"}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {siteUrl && (
          <>
            <Button asChild size="sm">
              <a href={siteUrl} target="_blank" rel="noreferrer">
                Visit site
                <ExternalLinkIcon />
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`${siteUrl}wp-admin/`} target="_blank" rel="noreferrer">
                WordPress admin
                <ExternalLinkIcon />
              </a>
            </Button>
          </>
        )}
        <Button asChild variant="outline" size="sm">
          <Link href={viewer?.isAdmin ? `/requests?product=${tenant.productId}&store=${tenant.id}` : `/requests?store=${tenant.id}`}>API log</Link>
        </Button>
        {canManage && (
          <StoreActions
            tenantId={tenant.id}
            storeName={tenant.name}
            storesHref={storesHref}
            isSuspended={tenant.isSuspended}
            canSuspend={tenant.statusCode !== StatusCode.Failed}
          />
        )}
      </div>

      {tenant.onHold && (
        <Card data-testid="on-hold">
          <CardHeader>
            <CardTitle>This site is on hold</CardTitle>
            <CardDescription>
              It was moved in{tenant.dateHeld ? ` on ${formatDateTime(tenant.dateHeld)}` : ""} and doesn&apos;t act as the live site yet,
              so it can&apos;t clash with the old one while you look it over.
            </CardDescription>
            {canGoLive && (
              <CardAction>
                <GoLive
                  tenantId={tenant.id}
                  storeName={tenant.name}
                  onBaseAddress={tenant.domains.some((d) => d.isMain && d.isBase)}
                />
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 ps-5 text-sm">
              <li>Scheduled tasks are paused: no subscription renewals, order clean-ups, or newsletter and feed syncs.</li>
              <li>Email goes only to you and your team. Every other email is held, not sent.</li>
              <li>Search engines are asked not to index it.</li>
            </ul>
            <p className="text-muted-foreground mt-3 text-sm">
              When it looks right, point your domain at this store, then go live.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid items-start gap-4 md:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Store</CardTitle>
            <CardAction>
              <span className="text-muted-foreground text-sm">Created {formatDate(tenant.dateCreated)}</span>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Storefront">{tenant.productName}</Row>
            <Row label="Version">{tenant.versionName}</Row>
            <Row label="Template">{tenant.snapshotName ?? "—"}</Row>
            {tenant.keepsOwnCode && <Row label="Plugins and themes">Its own (moved in)</Row>}
            <Row label="Last changed">{formatDateTime(tenant.dateChanged)}</Row>
            {tenant.isSuspended && <Row label="Suspended">{formatDateTime(tenant.dateSuspended)}</Row>}
            {settings.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2 text-sm">
                  <span className="text-muted-foreground">Set up with</span>
                  <div className="flex flex-wrap gap-1.5">
                    {settings.map((label) => (
                      <Badge key={label} variant="secondary">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
            <Separator />
            <details className="group text-sm">
              <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none select-none">
                <span className="group-open:hidden">Show details</span>
                <span className="hidden group-open:inline">Hide details</span>
              </summary>
              <div className="mt-3 space-y-3">
                <Row label="Subscription">
                  <span className="font-mono text-xs">{tenant.externalId}</span>
                </Row>
                <Row label="Store id">
                  <span className="font-mono text-xs">{tenant.id}</span>
                </Row>
              </div>
            </details>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:gap-6">
          {tenant.moveIn && (
            <Card>
              <CardHeader>
                <CardTitle>Moving the site in</CardTitle>
                <CardDescription>This store is built from a WordPress site sent with the AnyPress Export plugin.</CardDescription>
              </CardHeader>
              <CardContent>
                <MoveInStatus tenantId={tenant.id} moveIn={tenant.moveIn} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Domains</CardTitle>
              <CardDescription>The main domain serves the store; the others redirect to it.</CardDescription>
              <CardAction>
                <ChangeAddress tenantId={tenant.id} mainDomain={tenant.mainDomain} />
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              <Table className={tableClass}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead className="w-32 text-end">Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenant.domains.map((domain) => (
                    <TableRow key={domain.domainName}>
                      <TableCell className="font-medium break-all whitespace-normal">{domain.domainName}</TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-1">
                          {domain.isMain && <Badge variant="success">Main</Badge>}
                          {domain.isBase && <Badge variant="outline">Base</Badge>}
                          {!domain.isMain && !domain.isBase && (
                            <span className="text-muted-foreground text-sm">Redirect</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Email sender</CardTitle>
              <CardDescription>Where the store&apos;s receipts and password resets come from.</CardDescription>
            </CardHeader>
            <CardContent>
              <MailSender tenantId={tenant.id} mailDomain={mailDomain} connect={connect} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backups</CardTitle>
          <CardDescription>Restore puts the store back to how it was when the backup was taken.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table className={tableClass}>
            <TableHeader>
              <TableRow>
                <TableHead>Taken</TableHead>
                <TableHead className="max-sm:hidden">Reason</TableHead>
                <TableHead className="text-end">Size</TableHead>
                <TableHead className="text-end">Status</TableHead>
                <TableHead className="w-24">
                  <span className="sr-only">Restore</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenant.backups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground h-16 text-center">
                    No backups yet.
                  </TableCell>
                </TableRow>
              ) : (
                tenant.backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell>
                      {formatDateTime(backup.dateCreated)}
                      <div className="text-muted-foreground text-xs sm:hidden">{backupReasonLabel(backup.reason)}</div>
                    </TableCell>
                    <TableCell className="max-sm:hidden">{backupReasonLabel(backup.reason)}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatBytes(backup.sizeBytes)}</TableCell>
                    <TableCell className="text-end">
                      <StatusBadge statusCode={backup.statusCode} />
                    </TableCell>
                    <TableCell className="text-end">
                      {canRestore && backup.statusCode === StatusCode.Done && (
                        <RestoreBackup
                          tenantId={tenant.id}
                          storeName={tenant.name}
                          backupId={backup.id}
                          takenAt={backup.dateCreated}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>Recent work on this store, newest first. Finished tasks are kept for 7 days.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table className={tableClass}>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead className="max-sm:hidden">When</TableHead>
                <TableHead className="max-sm:hidden">Error</TableHead>
                <TableHead className="text-end">State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenant.jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground h-16 text-center">
                    No recent jobs.
                  </TableCell>
                </TableRow>
              ) : (
                tenant.jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="whitespace-normal">
                      <div className="font-medium">{jobTypeLabel(job.type)}</div>
                      {/* Below sm, When and Error move under the job's name. */}
                      <div className="text-muted-foreground space-y-0.5 text-xs sm:hidden">
                        <div>{formatDateTime(job.failedAt ?? job.createdAt)}</div>
                        {job.error && <div className="line-clamp-2 break-words">{job.error}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap max-sm:hidden">
                      {formatDateTime(job.failedAt ?? job.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-md truncate max-sm:hidden">{job.error ?? "—"}</TableCell>
                    <TableCell className="text-end">
                      <JobStateBadge state={job.state} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
