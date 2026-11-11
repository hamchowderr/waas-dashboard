import { SiteTypeIcon, siteTypeOf } from "@/components/admin/site-type";
import type { Metadata } from "next";
import * as React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArchiveIcon, ChevronDownIcon, ChevronLeft, CirclePauseIcon, ExternalLinkIcon, GlobeIcon, HistoryIcon, IdCardIcon, ImportIcon, LanguagesIcon, MailIcon } from "lucide-react";

import { canChange, getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { backupReasonLabel, formatBytes, formatDate, formatDateTime, jobTypeLabel, plainError } from "@/lib/format";
import { StatusCode } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { OnHoldBadge, StatusBadge, SuspendedBadge } from "@/components/admin/status-badge";
import { EmptyState } from "@/components/admin/empty-state";
import { JobStateBadge } from "@/components/admin/job-state-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardIcon, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BoughtDomainRow, BuyDomain } from "./buy-domain";
import { ChangeAddress } from "./change-address";
import { DomainDnsButton } from "./domain-setup";
import { GoLive } from "./go-live";
import { MailSender } from "./mail-sender";
import { RestoreBackup } from "./restore-backup";
import { BackUpNow } from "./back-up-now";
import { MoveInStatus } from "./move-in";
import { StoreActions } from "./store-actions";
import { WordPressLoginButton } from "../../wordpress-login";
import { HighLevelLinkPanel } from "./highlevel-link";
import { SitePluginsCard } from "./site-plugins";
import { SiteLanguagesPanel } from "./site-languages";
import { AutoRefresh, JobProgressCard } from "@/components/admin/job-progress";

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
  const [tenant, mailDomain, viewer, bought, plugins] = await Promise.all([
    getAdminApi().tenant(id),
    getAdminApi().mailDomain(id).catch(() => null),
    getViewer(),
    // Domains bought for the store; none when buying isn't set up on the API.
    getAdminApi().boughtDomains(id).catch(() => []),
    // What comes installed; nothing shows when the API can't say.
    getAdminApi().tenantPlugins(id).catch(() => null)
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
  // Each custom domain's DNS records and whether it reaches the store yet; a lookup that fails shows nothing.
  const custom = tenant.domains.filter((d) => !d.isBase);
  const setups = new Map(
    (await Promise.all(custom.map((d) => getAdminApi().domainSetup(id, d.domainName).catch(() => null))))
      .filter((s) => s !== null)
      .map((s) => [s.domainName, s])
  );
  // A store being removed or that failed can't be rolled back until it's fixed.
  const canRestore = tenant.statusCode !== StatusCode.Removing && tenant.statusCode !== StatusCode.Failed;
  // A backup can be taken by anyone who may change the store, once it is live.
  const canBackUp = canRestore && !!viewer && canChange(viewer);
  // Suspend and delete are the platform admin's; a seller's stores follow their shop's subscriptions.
  const canManage = viewer?.isAdmin === true && tenant.statusCode !== StatusCode.Removing;
  // Going live is the site owner's own step: anyone who can change the storefront may take it.
  const canGoLive = tenant.onHold && !!viewer && canChange(viewer) && canRestore;
  // Links to the site only once it is up.
  const siteUrl = tenant.mainDomain && tenant.statusCode === StatusCode.Done ? `https://${tenant.mainDomain}/` : null;
  // One-click sign-in to wp-admin for anyone who may change the store; members get the plain login page.
  const canLogIn = !!viewer && canChange(viewer) && !tenant.isSuspended;
  // A job is running: a store being made or changed, or a backup (which leaves the store Ready meanwhile).
  const waitingForSite = !!tenant.moveIn && !tenant.moveIn.startedAt;
  // The store's languages, asked of the store itself once it is up; nothing shows when it can't say.
  const languages =
    tenant.statusCode === StatusCode.Done && !tenant.isSuspended ? await getAdminApi().tenantLanguages(id).catch(() => null) : null;
  const working = (tenant.statusCode === StatusCode.Pending && !waitingForSite) || (!!tenant.progress && !tenant.progress.failedAt);

  return (
    <div className="space-y-5 lg:space-y-7">
      {/* The store's own header: who it is, how it's doing, and what you can do with it, at the top of the sheet. */}
      <header data-slot="store-header" className="flex flex-col gap-5 border-b pb-5 lg:pb-7 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href={storesHref}>
            <ChevronLeft />
            <span className="sr-only">Back to stores</span>
          </Link>
        </Button>
        <SiteTypeIcon siteTypes={tenant.siteTypes} className="size-14 max-sm:hidden [&_svg]:size-6" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-extrabold tracking-[-0.03em] lg:text-[2rem]">{tenant.name}</h1>
            <StatusBadge statusCode={tenant.statusCode} />
            {tenant.isSuspended && <SuspendedBadge />}
            {tenant.onHold && <OnHoldBadge />}
          </div>
          <p className="text-muted-foreground truncate text-sm">
            {siteTypeOf(tenant.siteTypes).label} · {tenant.mainDomain ?? "No main domain"}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 xl:justify-end">
        {siteUrl && (
          <>
            <Button asChild size="sm">
              <a href={siteUrl} target="_blank" rel="noreferrer">
                Visit site
                <ExternalLinkIcon />
              </a>
            </Button>
            {canLogIn ? (
              <WordPressLoginButton tenantId={tenant.id} />
            ) : (
              <Button asChild variant="outline" size="sm">
                <a href={`${siteUrl}wp-admin/`} target="_blank" rel="noreferrer">
                  WordPress admin
                  <ExternalLinkIcon />
                </a>
              </Button>
            )}
          </>
        )}
        <StoreActions
          tenantId={tenant.id}
          storeName={tenant.name}
          storesHref={storesHref}
          apiLogHref={viewer?.isAdmin ? `/requests?product=${tenant.productId}&store=${tenant.id}` : `/requests?store=${tenant.id}`}
          owner={
            siteUrl && canLogIn && !tenant.onHold
              ? { lastSentAt: tenant.ownerNotifiedAt, lastSentTo: tenant.ownerNotifiedTo, ownerEmail: tenant.ownerEmail }
              : null
          }
          manage={canManage ? { isSuspended: tenant.isSuspended, canSuspend: tenant.statusCode !== StatusCode.Failed } : null}
        />
      </div>
      </header>

      {/* While a job runs, its steps; the page checks again every few seconds until it's done. */}
      <AutoRefresh active={working} />
      <JobProgressCard
        progress={tenant.progress}
        waiting={tenant.statusCode === StatusCode.Pending && !waitingForSite}
        gaveUp={tenant.statusCode === StatusCode.Failed}
      />

      {tenant.onHold && (
        <Card data-testid="on-hold">
          <CardHeader>
            <CardIcon>
              <CirclePauseIcon />
            </CardIcon>
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

      {/* Two columns from lg: its domains, plugins, backups and activity in the main one, the store's details and
          settings in a side column on the right. Each column stacks on its own, so neither leaves a gap. Below lg
          the main column comes first: what you came to change before the details. */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="grid min-w-0 gap-5 lg:gap-6">
          {tenant.moveIn && (
            <Card>
              <CardHeader>
                <CardIcon>
                  <ImportIcon />
                </CardIcon>
                <CardTitle>Moving the site in</CardTitle>
                <CardDescription>This store is built from a WordPress site copied with Reprint or sent with the AnyPress Export plugin.</CardDescription>
              </CardHeader>
              <CardContent>
                <MoveInStatus tenantId={tenant.id} moveIn={tenant.moveIn} statusCode={tenant.statusCode} onHold={tenant.onHold} />
              </CardContent>
            </Card>
          )}

          <Card id="domains" className="scroll-mt-20">
            <CardHeader>
              <CardIcon>
                <GlobeIcon />
              </CardIcon>
              <CardTitle>Domains</CardTitle>
              <CardDescription>The main domain serves the store; the others redirect to it.</CardDescription>
              <CardAction className="flex flex-wrap justify-end gap-2">
                <BuyDomain tenantId={tenant.id} ownerEmail={tenant.ownerEmail} />
                <ChangeAddress tenantId={tenant.id} mainDomain={tenant.mainDomain} />
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              <Table className={tableClass}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead className="text-end max-sm:hidden sm:w-44">Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenant.domains.map((domain) => (
                    // On a phone the role sits under the domain, so a long host never squeezes it into a stack.
                    <TableRow key={domain.domainName} className="max-sm:flex max-sm:flex-col">
                      <TableCell className={cn("whitespace-normal max-sm:pb-1", domain.isBase ? "text-foreground/80" : "font-medium")}>
                        {/* Long hosts break at their dots, never mid-word. */}
                        {domain.domainName.split(".").map((part, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && "."}
                            {i > 0 && <wbr />}
                            {part}
                          </React.Fragment>
                        ))}
                      </TableCell>
                      <TableCell className="text-end max-sm:ps-(--card-spacing) max-sm:pt-0 max-sm:text-start">
                        <div className="flex flex-wrap items-center justify-end gap-1 max-sm:justify-start sm:flex-nowrap">
                          {setups.has(domain.domainName) && (
                            <DomainDnsButton
                              key={`${domain.domainName}-${setups.get(domain.domainName)!.pointsHere}`}
                              tenantId={tenant.id}
                              initial={setups.get(domain.domainName)!}
                            />
                          )}
                          {domain.isMain && <Badge variant="success">Main</Badge>}
                          {domain.isBase && <Badge variant="outline">Built-in address</Badge>}
                          {!domain.isMain && !domain.isBase && (
                            <span className="text-muted-foreground text-sm">Redirect</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {bought.length > 0 && (
                <div className="border-t">
                  <div className="text-muted-foreground px-(--card-spacing) pt-3 text-xs font-medium">Bought here</div>
                  <div className="divide-y">
                    {bought.map((b) => (
                      <BoughtDomainRow key={b.id} tenantId={tenant.id} domain={b} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {plugins && <SitePluginsCard plugins={plugins} highLevel={tenant.highLevel} theme={!tenant.keepsOwnCode} />}

          <Card>
            <CardHeader>
              <CardIcon>
                <ArchiveIcon />
              </CardIcon>
              <CardTitle>Backups</CardTitle>
              <CardDescription>Taken every night. Restore puts the store back to how it was when the backup was taken.</CardDescription>
              {canBackUp && (
                <CardAction>
                  <BackUpNow tenantId={tenant.id} storeName={tenant.name} />
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table className={tableClass}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Taken</TableHead>
                    <TableHead className="max-sm:hidden">Reason</TableHead>
                    <TableHead className="text-end max-sm:hidden">Size</TableHead>
                    <TableHead className="text-end">Status</TableHead>
                    <TableHead className="w-24">
                      <span className="sr-only">Restore</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenant.backups.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={5}>
                        <EmptyState icon={ArchiveIcon} title="No backups yet">
                          A backup is taken every night, and you can take one now. Each shows here, ready to restore.
                        </EmptyState>
                      </TableCell>
                    </TableRow>
                  ) : (
                    tenant.backups.map((backup) => (
                      <TableRow key={backup.id}>
                        <TableCell>
                          {formatDateTime(backup.dateCreated)}
                          <div className="text-muted-foreground text-xs sm:hidden">
                            {backupReasonLabel(backup.reason)} · {formatBytes(backup.sizeBytes)}
                          </div>
                        </TableCell>
                        <TableCell className="max-sm:hidden">{backupReasonLabel(backup.reason)}</TableCell>
                        <TableCell className="text-end tabular-nums max-sm:hidden">{formatBytes(backup.sizeBytes)}</TableCell>
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
              <CardIcon>
                <HistoryIcon />
              </CardIcon>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Recent work on this store, newest first. Finished tasks are kept for 7 days.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table className={tableClass}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead className="max-sm:hidden">When</TableHead>
                    <TableHead className="max-sm:hidden">Error</TableHead>
                    <TableHead className="text-end">State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenant.jobs.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={4}>
                        <EmptyState icon={HistoryIcon} title="Nothing in the last 7 days">
                          Builds, backups and changes to this store show here.
                        </EmptyState>
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
                            {job.error && <div className="line-clamp-2 break-words">{plainError(job.error)}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap max-sm:hidden">
                          {formatDateTime(job.failedAt ?? job.createdAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-md truncate max-sm:hidden">{plainError(job.error) ?? "—"}</TableCell>
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
        <div className="grid min-w-0 gap-5 lg:gap-6">
        <Card>
          <CardHeader>
            <CardIcon>
              <IdCardIcon />
            </CardIcon>
            <CardTitle>Store</CardTitle>
            <CardDescription>Created {formatDate(tenant.dateCreated)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Storefront">{tenant.productName}</Row>
            <Row label="Version">{tenant.versionName}</Row>
            <Row label="Template">{tenant.snapshotName ?? "—"}</Row>
            {tenant.keepsOwnCode && <Row label="Plugins and themes">Its own (moved in)</Row>}
            <Row label="Last changed">{formatDateTime(tenant.dateChanged)}</Row>
            {tenant.isSuspended && <Row label="Suspended">{formatDateTime(tenant.dateSuspended)}</Row>}
            {tenant.ownerEmail && <Row label="Owner">{tenant.ownerEmail}</Row>}
            {!tenant.onHold && (
              <Row label="Owner emailed">
                {tenant.ownerNotifiedAt ? `${formatDateTime(tenant.ownerNotifiedAt)} to ${tenant.ownerNotifiedTo}` : "Not sent"}
              </Row>
            )}
            <Separator />
            <details className="group text-sm">
              <summary className="text-primary inline-flex cursor-pointer list-none items-center gap-1 font-semibold select-none hover:underline pointer-coarse:min-h-11">
                <span className="group-open:hidden">Show details</span>
                <span className="hidden group-open:inline">Hide details</span>
                <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" aria-hidden />
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

          {(tenant.highLevel || tenant.siteTypes.includes("highlevel")) && (
            <Card>
              <CardHeader>
                <CardIcon className="bg-white ring-border ring-1 ring-inset">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a small local logo */}
                  <img src="/integrations/highlevel.svg" alt="" className="size-5" />
                </CardIcon>
                <CardTitle>HighLevel</CardTitle>
                <CardDescription>Where this site&apos;s WP Fusion sends new users as contacts.</CardDescription>
              </CardHeader>
              <CardContent>
                <HighLevelLinkPanel
                  tenantId={tenant.id}
                  link={tenant.highLevel}
                  canCheck={canLogIn && tenant.statusCode === StatusCode.Done}
                />
              </CardContent>
            </Card>
          )}
          {languages && (
            <Card>
              <CardHeader>
                <CardIcon>
                  <LanguagesIcon />
                </CardIcon>
                <CardTitle>Languages</CardTitle>
                <CardDescription>The site in more than one language, with a language switcher in its menu.</CardDescription>
              </CardHeader>
              <CardContent>
                <SiteLanguagesPanel tenantId={tenant.id} languages={languages} canChange={canLogIn} />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardIcon>
                <MailIcon />
              </CardIcon>
              <CardTitle>Email sender</CardTitle>
              <CardDescription>Where the store&apos;s receipts and password resets come from.</CardDescription>
            </CardHeader>
            <CardContent>
              <MailSender tenantId={tenant.id} mailDomain={mailDomain} connect={connect} />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
