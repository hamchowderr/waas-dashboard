import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import type { ProspectDemo, ProspectRoute } from "@/lib/api/types";
import { formatAgo } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { siteTypeOf } from "@/components/admin/site-type";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddProspect, ProspectRowActions } from "./prospect-actions";
import { ROUTE_LABELS } from "./routes";

export const metadata: Metadata = { title: "Prospects" };

const DEMO_URL = "https://anypress.io/try?for=";

function Status({ demo }: { demo: ProspectDemo }) {
  if (demo.statusCode === 0) return <Badge variant="secondary">Reading website</Badge>;
  if (demo.statusCode === 2)
    return (
      <Badge variant="destructive" title={demo.error ?? undefined}>
        Couldn&apos;t read
      </Badge>
    );
  return <Badge variant="outline">Demo ready</Badge>;
}

function Logo({ demo }: { demo: ProspectDemo }) {
  const color = demo.brand?.colors.primary;
  return (
    <span
      className="bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border text-xs font-semibold"
      style={color ? { borderColor: color } : undefined}>
      {demo.brand?.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- a logo copied from the business's own website
        <img src={demo.brand.logo} alt="" className="size-full object-contain p-0.5" loading="lazy" />
      ) : (
        demo.company.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<{ route?: string }> }) {
  if (!(await getViewer())?.isAdmin) notFound();
  const { route: asked } = await searchParams;
  const route = (Object.keys(ROUTE_LABELS) as ProspectRoute[]).find((r) => r === asked) ?? null;
  const all = await getAdminApi().prospectDemos();
  const demos = route ? all.filter((d) => d.route === route) : all;
  const ready = all.filter((d) => d.statusCode === 1).length;

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Prospects"
        description={`Businesses to contact. Each gets a demo at anypress.io/try in its own name, colours and logo, read once from its website. ${ready} of ${all.length} demos are ready.`}
      >
        <AddProspect />
      </PageHeader>
      <Tabs value={route ?? "all"}>
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="all" asChild>
            <Link href="/prospects">All ({all.length})</Link>
          </TabsTrigger>
          {(Object.keys(ROUTE_LABELS) as ProspectRoute[]).map((r) => (
            <TabsTrigger key={r} value={r} asChild>
              <Link href={`/prospects?route=${r}`}>
                {ROUTE_LABELS[r]} ({all.filter((d) => d.route === r).length})
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Card className="py-0">
        <CardContent className="px-0">
          {demos.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">No prospects here yet.</p>
          ) : (
            // The list scrolls inside the card, so the page fits one laptop screen.
            <div className="max-h-[calc(100dvh-16rem)] overflow-auto">
              <Table>
                <TableHeader className="bg-card sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="pl-4">Business</TableHead>
                    <TableHead className="max-sm:hidden">Route</TableHead>
                    <TableHead className="max-lg:hidden">Site type</TableHead>
                    <TableHead className="max-xl:hidden">Group</TableHead>
                    <TableHead className="max-lg:hidden">City</TableHead>
                    <TableHead className="max-xl:hidden">Priority</TableHead>
                    <TableHead className="max-sm:hidden">Status</TableHead>
                    <TableHead className="pr-4 text-right">Demo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demos.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="pl-4 whitespace-normal">
                        <div className="flex items-center gap-3">
                          <Logo demo={d} />
                          <div className="min-w-0">
                            <div className="font-medium">{d.company}</div>
                            <div className="text-muted-foreground text-xs break-all">
                              {d.website ? (
                                <a href={d.website} target="_blank" rel="noreferrer" className="hover:underline">
                                  {d.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                                </a>
                              ) : (
                                "No website"
                              )}
                              <span className="sm:hidden"> · {ROUTE_LABELS[d.route]}</span>
                            </div>
                            {d.notes && <div className="text-muted-foreground max-w-xs text-xs">{d.notes}</div>}
                            <div className="mt-1 sm:hidden">
                              <Status demo={d} />
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-sm:hidden">{ROUTE_LABELS[d.route]}</TableCell>
                      <TableCell className="max-lg:hidden">{siteTypeOf([d.siteType]).label}</TableCell>
                      <TableCell className="max-xl:hidden">{d.label ?? "—"}</TableCell>
                      <TableCell className="max-lg:hidden">{d.city ?? "—"}</TableCell>
                      <TableCell className="max-xl:hidden">{d.priority ?? "—"}</TableCell>
                      <TableCell className="max-sm:hidden">
                        <Status demo={d} />
                        {d.gatheredAt && <div className="text-muted-foreground mt-1 text-xs">Read {formatAgo(d.gatheredAt)}</div>}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <ProspectRowActions
                          id={d.id}
                          company={d.company}
                          demoUrl={d.statusCode === 1 ? `${DEMO_URL}${d.code}` : null}
                          canRead={Boolean(d.website)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
