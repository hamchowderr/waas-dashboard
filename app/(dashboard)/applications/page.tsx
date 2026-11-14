import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import type { ApplicationStatus } from "@/lib/api/types";
import { formatAgo } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApplicationStatusBadge } from "./status-badge";

export const metadata: Metadata = { title: "Applications" };

const TABS: { status: ApplicationStatus; label: string }[] = [
  { status: "pending", label: "Waiting" },
  { status: "approved", label: "Approved" },
  { status: "declined", label: "Declined" }
];

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (!(await getViewer())?.isAdmin) notFound();
  const { status: asked } = await searchParams;
  const status = TABS.find((t) => t.status === asked)?.status ?? "pending";
  const applications = await getAdminApi().applications(status);

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Applications"
        description="People who applied on anypress.io to sell websites. Approving one makes their storefront with a store limit, emails them a link to sign in, and builds their ready-made storefront if they asked for one."
      />
      <Tabs value={status}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.status} value={t.status} asChild>
              <Link href={`/applications?status=${t.status}`}>{t.label}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Business</TableHead>
                <TableHead className="max-sm:hidden">Applicant</TableHead>
                <TableHead className="max-lg:hidden">Sites in year one</TableHead>
                <TableHead className="max-lg:hidden">Sells from</TableHead>
                <TableHead className="max-sm:hidden">Applied</TableHead>
                <TableHead className="pr-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="pl-4 font-medium whitespace-normal">
                    <Link href={`/applications/${a.id}`} className="hover:underline">
                      {a.business}
                    </Link>
                    {a.highLevelAgency && (
                      <Badge variant="secondary" className="ml-2 align-middle">
                        HighLevel
                      </Badge>
                    )}
                    {/* On a phone the applicant and date ride under the business instead of in their own columns. */}
                    <span className="text-muted-foreground block text-xs font-normal sm:hidden">
                      {a.name} · {formatAgo(a.dateCreated)}
                    </span>
                  </TableCell>
                  <TableCell className="max-sm:hidden">
                    <div>{a.name}</div>
                    <div className="text-muted-foreground text-xs">{a.email}</div>
                  </TableCell>
                  <TableCell className="max-lg:hidden">{a.expectedSites}</TableCell>
                  <TableCell className="max-lg:hidden">{a.wantsStorefront ? "Ready-made storefront" : "Their own site"}</TableCell>
                  <TableCell className="max-sm:hidden" title={a.dateCreated}>{formatAgo(a.dateCreated)}</TableCell>
                  <TableCell className="pr-4">
                    <ApplicationStatusBadge status={a.status} />
                  </TableCell>
                </TableRow>
              ))}
              {applications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                    {status === "pending" ? "No applications waiting." : `No ${TABS.find((t) => t.status === status)!.label.toLowerCase()} applications yet.`}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
