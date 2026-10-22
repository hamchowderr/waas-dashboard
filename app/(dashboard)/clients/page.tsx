import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import type { Client } from "@/lib/api/types";
import { BriefcaseIcon } from "lucide-react";

import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddClientButton } from "./add-client-dialog";
import { RefreshWhileSettingUp } from "./refresh-while-setting-up";

export const metadata: Metadata = { title: "Clients" };

const STATUS: Record<Client["status"], { label: string; hint: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  setting_up: { label: "Setting up", hint: "Their site is being built", variant: "outline" },
  invited: { label: "Invited", hint: "Emailed; waiting for them to sign in", variant: "secondary" },
  active: { label: "Active", hint: "Signed in and using their site", variant: "default" },
  needs_attention: { label: "Needs attention", hint: "Something went wrong", variant: "destructive" },
};

const SIZE: Record<Client["size"], string> = { small: "Small", medium: "Medium", large: "Large" };

export default async function ClientsPage() {
  if (!(await getViewer())?.isAdmin) notFound();
  const clients = await getAdminApi().clients();

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Clients"
        description="People you give a site to. Add client makes their account and site and emails them a sign-in invitation.">
        <AddClientButton />
      </PageHeader>
      <RefreshWhileSettingUp active={clients.some((c) => c.status === "setting_up")} />
      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Client</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="pr-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => {
                const status = STATUS[c.status];
                return (
                  <TableRow key={c.productId}>
                    <TableCell className="pl-4">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-muted-foreground text-xs">{c.email}</div>
                    </TableCell>
                    <TableCell>
                      {c.tenantId && c.siteDomain ? (
                        <Link href={`/stores/${c.tenantId}`} className="hover:underline">
                          {c.siteDomain}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Not ready yet</span>
                      )}
                    </TableCell>
                    <TableCell>{SIZE[c.size]}</TableCell>
                    <TableCell className="pr-4">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <div className="text-muted-foreground mt-1 text-xs">
                        {c.problem ??
                          (c.status === "invited" && !c.invitationEmailed
                            ? "The email didn't send: resend it from their Team page"
                            : status.hint)}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="p-0">
                    <EmptyState icon={BriefcaseIcon} title="No clients yet" action={<AddClientButton />}>
                      People you set up sites for yourself. Adding one makes their account and site, and emails them a sign-in link.
                    </EmptyState>
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
