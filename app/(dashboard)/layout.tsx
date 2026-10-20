import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { canUseDashboard, getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import type { StorefrontOption } from "@/components/shell/storefront-switcher";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { SiteHeader } from "@/components/shell/site-header";
import { SessionKeepAlive } from "@/components/auth/session-keep-alive";
import { NoStorefront } from "@/components/auth/no-storefront";

const roleNames = { owner: "Owner", admin: "Admin", member: "Can view" } as const;

export default async function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  // proxy.ts only checks that a session cookie is there; this asks the API whose it is.
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  // Signed in, but not a platform admin and not (yet) in a storefront's organization.
  if (!canUseDashboard(viewer)) return <NoStorefront viewer={viewer} />;

  const cookieStore = await cookies();
  const defaultOpen =
    cookieStore.get("sidebar_state")?.value === "true" ||
    cookieStore.get("sidebar_state") === undefined;

  const api = getAdminApi();
  // The storefront switcher should not take the whole page down when the API is
  // unreachable; the page itself shows that error. Customers see one storefront: no switcher.
  let storefronts: StorefrontOption[] | null = null;
  let pendingApplications = 0;
  if (viewer.isAdmin) {
    const [overview, pending] = await Promise.allSettled([api.overview(), api.applications("pending")]);
    storefronts = overview.status === "fulfilled" ? overview.value.products : [];
    // An API without applications yet answers 404: none waiting.
    pendingApplications = pending.status === "fulfilled" ? pending.value.length : 0;
  }

  const active = viewer.active;
  const user = {
    name: viewer.user.name || viewer.user.email,
    detail: active
      ? `${active.productName} · ${roleNames[active.role as keyof typeof roleNames] ?? active.role}`
      : viewer.user.githubLogin
        ? `@${viewer.user.githubLogin}`
        : viewer.user.email,
    image: viewer.user.image
  };
  const memberships = viewer.isAdmin
    ? []
    : viewer.memberships.map((m) => ({
        organizationId: m.organizationId,
        productId: m.productId,
        productName: m.productName,
        active: m.productId === active?.productId
      }));

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 14)",
          "--content-padding": "calc(var(--spacing) * 6)",
          "--content-margin": "calc(var(--spacing) * 1.5)",
          "--content-full-height":
            "calc(100vh - var(--header-height) - (var(--content-padding) * 2.2) - (var(--content-margin) * 2.2))"
        } as React.CSSProperties
      }>
      {!api.isFixture && <SessionKeepAlive />}
      <AppSidebar isAdmin={viewer.isAdmin} pendingApplications={pendingApplications} />
      <SidebarInset>
        <SiteHeader storefronts={storefronts} isFixture={api.isFixture} user={user} memberships={memberships} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main p-(--content-padding) xl:group-data-[theme-content-layout=centered]/layout:mx-auto xl:group-data-[theme-content-layout=centered]/layout:w-full xl:group-data-[theme-content-layout=centered]/layout:max-w-7xl">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
