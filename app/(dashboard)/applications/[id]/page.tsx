import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationStatusBadge } from "../status-badge";
import { ApplicationDecision } from "./decision";

export const metadata: Metadata = { title: "Application" };

const STORE_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "anypress.site";

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getViewer())?.isAdmin) notFound();
  const { id } = await params;
  const application = /^[0-9a-f-]{36}$/i.test(id) ? await getAdminApi().application(id) : null;
  if (!application) notFound();
  const a = application;

  const rows: [string, React.ReactNode][] = [
    ["Name", a.name],
    ["Email", <a key="email" href={`mailto:${a.email}`} className="hover:underline">{a.email}</a>],
    [
      "Website",
      a.website ? (
        <a key="site" href={a.website} target="_blank" rel="noreferrer" className="break-all hover:underline">
          {a.website}
        </a>
      ) : (
        <span key="none" className="text-muted-foreground">None given</span>
      )
    ],
    ["Who they sell to", <p key="clients" className="whitespace-pre-wrap">{a.clients}</p>],
    ["Sites in their first year", a.expectedSites],
    [
      "Sells from",
      a.wantsStorefront
        ? `A ready-made storefront${a.storefrontSubdomain ? ` at ${a.storefrontSubdomain}.${STORE_DOMAIN}` : " (no address chosen)"}`
        : "Their own WordPress site, with WaaS Host"
    ],
    ["Applied", formatDateTime(a.dateCreated)]
  ];
  if (a.dateDecided) rows.push([a.status === "approved" ? "Approved" : "Declined", formatDateTime(a.dateDecided)]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader title={a.business} description="An application to sell websites, sent from anypress.io.">
        <div className="flex items-center gap-2">
          <ApplicationStatusBadge status={a.status} />
          <Button asChild variant="outline" size="sm">
            <Link href={`/applications?status=${a.status}`}>All applications</Link>
          </Button>
        </div>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>What they told us</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[12rem_1fr]">
              {rows.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground text-sm">{label}</dt>
                  <dd className="text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Decision</CardTitle>
          </CardHeader>
          <CardContent>
            {a.status === "pending" ? (
              <ApplicationDecision application={a} storeDomain={STORE_DOMAIN} />
            ) : a.status === "approved" && a.productId ? (
              <div className="space-y-3 text-sm">
                <p>Approved. Their owner invitation was emailed to {a.email}.</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/keys?product=${a.productId}`}>API keys and storefront</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/team?product=${a.productId}`}>Team</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {a.status === "declined" ? "Declined. They were emailed and may apply again." : "Approved."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
