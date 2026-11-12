import { GavelIcon, MessageSquareTextIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import type { SellerApplication } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardIcon } from "@/components/ui/card";
import { ApplicationStatusBadge } from "../status-badge";
import { ApplicationDecision } from "./decision";
import PRICES from "@/lib/pricing.json";

export const metadata: Metadata = { title: "Application" };

/** The storefront's Who we help groups (the API's AUDIENCES). */
const AUDIENCES: Record<string, string> = {
  shops: "Shops and makers",
  specialty: "Specialty retailers",
  courses: "Course creators",
  associations: "Chambers and associations",
  churches: "Churches",
  locations: "Franchises and multi-location businesses",
  freelancers: "Freelancers and studios",
  software: "Software companies"
};

const withOther = (list: string, other: string | null) => (other ? `${list}. Also: ${other}` : list);
const typeName = (key: string) => PRICES.siteTypes.find((t) => t.key === key)?.name ?? key;

/** The kinds of sites they sell and who their customers are, as they answered on the form. */
function kindsRows(a: SellerApplication): [string, string][] {
  const types = a.siteTypes ? a.siteTypes.map(typeName).join(", ") : "Not sure yet (every kind)";
  const customers = a.audiences?.length ? a.audiences.map((k) => AUDIENCES[k] ?? k).join(", ") : "None of the listed groups";
  return [
    ["Kinds of sites", withOther(types, a.siteTypesOther)],
    ["Their customers", withOther(customers, a.audiencesOther)]
  ];
}

const STORE_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "anypress.site";

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getViewer())?.isAdmin) notFound();
  const { id } = await params;
  const application = /^[0-9a-f-]{36}$/i.test(id) ? await getAdminApi().application(id) : null;
  if (!application) notFound();
  const a = application;

  const rows: [string, React.ReactNode][] = [
    ["Name", a.name],
    ["Email", <a key="email" href={`mailto:${a.email}`} className="text-primary underline-offset-4 hover:underline">{a.email}</a>],
    [
      "Website",
      a.website ? (
        <a key="site" href={a.website} target="_blank" rel="noreferrer" className="text-primary break-all underline-offset-4 hover:underline">
          {a.website}
        </a>
      ) : (
        <span key="none" className="text-muted-foreground">None given</span>
      )
    ],
    ["Who they sell to", <p key="clients" className="whitespace-pre-wrap">{a.clients}</p>],
    ["Sites in their first year", a.expectedSites],
    ...kindsRows(a),
    [
      "Sells from",
      a.wantsStorefront
        ? `A ready-made storefront${a.storefrontSubdomain ? ` at ${a.storefrontSubdomain}.${STORE_DOMAIN}` : " (no address chosen)"}`
        : "Their own WordPress site, with AnyPress Host"
    ],
    ["HighLevel agency", a.highLevelAgency ? "Yes, set them up with the AnyPress app for HighLevel" : "No"],
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
            <CardIcon>
              <MessageSquareTextIcon />
            </CardIcon>
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
            <CardIcon>
              <GavelIcon />
            </CardIcon>
            <CardTitle>Decision</CardTitle>
          </CardHeader>
          <CardContent>
            {a.status === "pending" ? (
              <ApplicationDecision application={a} storeDomain={STORE_DOMAIN} />
            ) : a.status === "approved" && a.productId ? (
              <div className="space-y-3 text-sm">
                <p>{a.resellerId ? "Approved as a reseller." : "Approved."} Their owner invitation was emailed to {a.email}.</p>
                <div className="flex flex-wrap gap-2">
                  {a.resellerId && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/resellers/${a.resellerId}`}>Reseller account</Link>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/keys?product=${a.productId}`}>API keys and storefront</Link>
                  </Button>
                  {!a.resellerId && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/team?product=${a.productId}`}>Team</Link>
                    </Button>
                  )}
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
