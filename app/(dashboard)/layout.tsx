import React from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { canChange, canUseDashboard, getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import type { StorefrontOption } from "@/components/shell/storefront-switcher";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { SiteHeader } from "@/components/shell/site-header";
import { SessionKeepAlive } from "@/components/auth/session-keep-alive";
import { NoStorefront } from "@/components/auth/no-storefront";
import { readAppearance } from "@/lib/appearance";
import { brandColorVars } from "@/lib/branding";

const roleNames = { owner: "Owner", admin: "Admin", member: "Can view" } as const;

/** A branded storefront's name on the browser tab, and its icon (Branding page). */
export async function generateMetadata(): Promise<Metadata> {
  const brand = (await getViewer().catch(() => null))?.brand;
  if (!brand) return {};
  return {
    ...(brand.name ? { title: { default: brand.name, template: `%s · ${brand.name}` } } : {}),
    ...(brand.iconUrl ? { icons: { icon: brand.iconUrl } } : {})
  };
}

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
  // The brand's color is the default accent; an accent the person picked in Appearance wins.
  const brand = viewer.brand;
  const accentPicked = readAppearance((name) => cookieStore.get(name)?.value).accent !== "default";
  const brandVars = brand && !accentPicked ? brandColorVars(brand.color) : {};
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
      {/* On <body>, so dialogs and toasts (rendered outside this tree) take the color too. The values are checked #rrggbb. */}
      {Object.keys(brandVars).length > 0 && (
        <style>{`body{${Object.entries(brandVars).map(([k, v]) => `${k}:${v}`).join(";")}}`}</style>
      )}
      {!api.isFixture && <SessionKeepAlive />}
      <AppSidebar
        isAdmin={viewer.isAdmin}
        pendingApplications={pendingApplications}
        brand={brand && { name: brand.name, logoUrl: brand.logoUrl, supportEmail: brand.supportEmail }}
      />
      <SidebarInset>
        <SiteHeader
          storefronts={storefronts}
          isFixture={api.isFixture}
          user={user}
          memberships={memberships}
          viewOnly={!canChange(viewer)}
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main p-(--content-padding) xl:group-data-[theme-content-layout=centered]/layout:mx-auto xl:group-data-[theme-content-layout=centered]/layout:w-full xl:group-data-[theme-content-layout=centered]/layout:max-w-7xl">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
