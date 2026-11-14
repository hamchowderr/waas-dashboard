"use client";

import * as React from "react";
import { ExternalLinkIcon, FileTextIcon, GlobeIcon, MoreHorizontalIcon, PlusIcon, RefreshCwIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { toast } from "sonner";

import type { ProspectDemo, ProspectDemoList } from "@/lib/api/types";
import { siteTypeOf } from "@/components/admin/site-type";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardIcon, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prospectList, readAgain, readWebsites, removeProspect } from "./actions";
import { ScoreRing, WebsiteReport } from "./website-check";

const FEATURE_WORDS: Record<string, string> = { shop: "shop", bookings: "bookings", events: "events", members: "members", blog: "blog", donations: "donations" };

/** "Wix · has shop, blog": what their website runs on and what it has now. */
function siteLine(d: ProspectDemo): string | null {
  const site = d.brand?.site;
  if (!site) return d.report?.builder ?? null;
  const has = site.features.map((f) => FEATURE_WORDS[f] ?? f);
  return [site.platform ?? d.report?.builder ?? "Builder not shown", has.length ? `has ${has.join(", ")}` : "pages only"].join(" · ");
}

/** The demo link as it can be sent: absolute, whatever address the dashboard is on. */
const fullLink = (url: string) => (url.startsWith("/") && typeof window !== "undefined" ? `${window.location.origin}${url}` : url);

function Logo({ demo }: { demo: ProspectDemo }) {
  const color = demo.brand?.colors.primary;
  return (
    <span className="bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border text-xs font-semibold" style={color ? { borderColor: color } : undefined}>
      {demo.brand?.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- a logo copied from the business's own website
        <img src={demo.brand.logo} alt="" className="size-full object-contain p-0.5" loading="lazy" />
      ) : (
        demo.company.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

function Status({ demo }: { demo: ProspectDemo }) {
  if (demo.statusCode === 0)
    return (
      <Badge variant="secondary">
        <Spinner />
        Reading
      </Badge>
    );
  if (demo.statusCode === 2)
    return (
      <Badge variant="destructive" title={demo.error ?? undefined}>
        Couldn&apos;t Read
      </Badge>
    );
  return <Badge variant="outline">Demo Ready</Badge>;
}

/**
 * The storefront's prospects: each business's website read once, giving the website check, what kind of site it is
 * and a demo in its own look to send them. Businesses come from the prospect finder or are typed in.
 */
export function ProspectList({ productId, sender, brand, refresh }: { productId: string; sender: string | null; brand: string; refresh: number }) {
  const [list, setList] = React.useState<ProspectDemoList | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [report, setReport] = React.useState<ProspectDemo | null>(null);
  const [removing, setRemoving] = React.useState<ProspectDemo | null>(null);

  const apply = React.useCallback((res: Awaited<ReturnType<typeof prospectList>>) => {
    if (res.ok) {
      setList(res.list);
      setError(null);
    } else setError(res.error);
  }, []);
  const load = React.useCallback(async () => apply(await prospectList(productId)), [apply, productId]);

  React.useEffect(() => {
    let live = true;
    prospectList(productId).then((res) => live && apply(res));
    return () => {
      live = false;
    };
  }, [apply, productId, refresh]);

  // While a website is being read, look again every few seconds.
  const reading = list?.prospects.some((p) => p.statusCode === 0) ?? false;
  React.useEffect(() => {
    if (!reading) return;
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [reading, load]);

  const again = async (d: ProspectDemo) => {
    const res = await readAgain(productId, d.id);
    if (!res.ok) return void toast.error(res.error);
    toast.success(`Reading ${d.company}'s website again.`);
    await load();
  };

  const reads = list?.reads;
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <CardIcon>
            <UsersIcon />
          </CardIcon>
          <div className="space-y-1.5">
            <CardTitle>Your Prospects</CardTitle>
            <CardDescription>
              Each business&apos;s website is read once: a free website check to send them, what their site runs on, and a demo website in their own look.
              {reads ? (reads.limit === null ? ` ${reads.used} websites read this month.` : ` ${reads.used} of ${reads.limit} website reads used this month.`) : ""}
            </CardDescription>
          </div>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}>
          <PlusIcon data-icon="inline-start" />
          Add a Business
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="text-destructive mb-3 text-sm">{error}</p>}
        {!list ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : !list.prospects.length ? (
          <EmptyState icon={GlobeIcon} title="No prospects yet">
            Find businesses on the Find Prospects tab and press Read Website, or add one here.
          </EmptyState>
        ) : (
          <div className="max-h-[calc(100dvh-18rem)] overflow-auto rounded-lg border">
            <Table>
              <TableHeader className="bg-background sticky top-0 z-10">
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead className="max-md:hidden">Their Website</TableHead>
                  <TableHead className="max-sm:hidden">Check</TableHead>
                  <TableHead className="max-lg:hidden">Demo</TableHead>
                  <TableHead className="w-0 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.prospects.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <Logo demo={d} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{d.company}</p>
                          {d.website && <p className="text-muted-foreground truncate text-xs break-all md:hidden">{d.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</p>}
                          <div className="mt-1 lg:hidden">
                            <Status demo={d} />
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-md:hidden">
                      {d.website && (
                        <a href={d.website} target="_blank" rel="noreferrer" className="hover:text-foreground text-muted-foreground block max-w-56 truncate text-sm underline-offset-2 hover:underline">
                          {d.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                        </a>
                      )}
                      {siteLine(d) && <p className="text-muted-foreground text-xs">{siteLine(d)}</p>}
                    </TableCell>
                    <TableCell className="max-sm:hidden">
                      {d.report ? (
                        <button type="button" className="flex items-center gap-2 rounded-md text-left text-sm hover:underline" onClick={() => setReport(d)} aria-label={`${d.company}'s website check: ${d.report.score} of 100`}>
                          <ScoreRing score={d.report.score} size={36} compact />
                          <span className="max-2xl:sr-only">Report</span>
                        </button>
                      ) : d.statusCode === 0 ? (
                        <span className="text-muted-foreground text-sm">Checking…</span>
                      ) : (
                        <span className="text-muted-foreground text-sm" title={d.error ?? undefined}>
                          No report
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-lg:hidden">
                      <div className="flex items-center gap-2">
                        <Status demo={d} />
                        {d.demoUrl && <span className="text-muted-foreground text-xs">{siteTypeOf([d.siteType]).label}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {d.demoUrl && (
                          <>
                            <Button variant="outline" size="sm" asChild>
                              <a href={d.demoUrl} target="_blank" rel="noreferrer">
                                <ExternalLinkIcon data-icon="inline-start" />
                                <span className="max-2xl:sr-only">Open Demo</span>
                              </a>
                            </Button>
                          </>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`More for ${d.company}`}>
                              <MoreHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {d.report && (
                              <DropdownMenuItem onSelect={() => setReport(d)}>
                                <FileTextIcon />
                                Website Check
                              </DropdownMenuItem>
                            )}
                            {d.demoUrl && (
                              <DropdownMenuItem
                                onSelect={() =>
                                  void navigator.clipboard.writeText(fullLink(d.demoUrl!)).then(
                                    () => toast.success("Demo link copied."),
                                    () => toast.error("Couldn't copy the link.")
                                  )
                                }
                              >
                                <ExternalLinkIcon />
                                Copy Demo Link
                              </DropdownMenuItem>
                            )}
                            {d.website && d.statusCode !== 0 && (
                              <DropdownMenuItem onSelect={() => void again(d)}>
                                <RefreshCwIcon />
                                Read Website Again
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(d)}>
                              <Trash2Icon />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AddBusiness productId={productId} open={adding} onOpenChange={setAdding} onAdded={load} />

      <Dialog open={!!report} onOpenChange={(open) => !open && setReport(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{report?.company}&apos;s Website Check</DialogTitle>
            <DialogDescription>A free report to send them, in your name. Checked when their website was read.</DialogDescription>
          </DialogHeader>
          {report?.report && <WebsiteReport productId={productId} prospectId={report.id} report={report.report} sender={sender} brand={brand} />}
        </DialogContent>
      </Dialog>

      <ConfirmAction
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.company ?? "this prospect"}?`}
        description="Its website check and demo go too, and the demo link stops working."
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          if (!removing) return true;
          const res = await removeProspect(productId, removing.id);
          if (!res.ok) {
            toast.error(res.error);
            return false;
          }
          await load();
          return true;
        }}
      />
    </Card>
  );
}

/** One business typed in: its name and website, read like one from the finder. */
function AddBusiness({ productId, open, onOpenChange, onAdded }: { productId: string; open: boolean; onOpenChange: (open: boolean) => void; onAdded: () => Promise<void> }) {
  const [company, setCompany] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await readWebsites(productId, [{ company, website }]);
      if (!res.ok) return setError(res.error);
      if (!res.added) return setError("That website is on your list already.");
      setCompany("");
      setWebsite("");
      onOpenChange(false);
      await onAdded();
    });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add a Business</DialogTitle>
            <DialogDescription>We&apos;ll read its website for the check and a demo in its own look. It takes about a minute and uses one website read.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="prospect-company">Business name</Label>
            <Input id="prospect-company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={200} required autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prospect-website">Website</Label>
            <Input id="prospect-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="joesplumbing.com" inputMode="url" maxLength={2000} required autoComplete="off" />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending || !company.trim() || !website.trim()}>
              {pending && <Spinner data-icon="inline-start" />}
              Read Website
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
