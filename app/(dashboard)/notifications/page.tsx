import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BellIcon } from "lucide-react";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardIcon } from "@/components/ui/card";
import { AlertsToggle } from "@/components/shell/alerts-toggle";
import { NotificationRow } from "@/components/shell/notification-bell";
import { MarkAllRead } from "./mark-all-read";

export const metadata: Metadata = { title: "Notifications" };

/**
 * Everything the bell shows, newest first (the last 50 of the 30 days kept), plus this device's alerts. Linked from
 * the account menu and the bell's footer.
 */
export default async function NotificationsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const list = await getAdminApi().notifications(viewer.user.id, 50);

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader title="Notifications" description="What happened to your stores and versions in the last 30 days, and alerts on this device." />
      <Card>
        <CardHeader>
          <CardIcon>
            <BellIcon />
          </CardIcon>
          <CardTitle>Phone and computer alerts</CardTitle>
          <CardDescription>Turn this on in each browser or phone you want alerts on.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertsToggle variant="card" />
        </CardContent>
      </Card>
      <Card className="gap-0 overflow-hidden py-0">
        {list.items.length === 0 ? (
          <EmptyState icon={BellIcon} title="No notifications in the last 30 days">
            When a store is ready, goes live or a task fails, it shows up here.
          </EmptyState>
        ) : (
          <>
            <div className="flex min-h-14 items-center justify-between gap-3 border-b px-4 py-2">
              <p className="text-sm font-medium">{list.unread > 0 ? `${list.unread} new` : "All read"}</p>
              {list.unread > 0 && <MarkAllRead />}
            </div>
            <ul className="divide-y">
            {list.items.map((n) => (
              <NotificationRow key={n.id} n={n} showStorefront={!!viewer.isAdmin} />
            ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
