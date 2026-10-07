import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth, isAllowed, signOut } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import type { StorefrontOption } from "@/components/layout/header/store-switcher";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { SiteHeader } from "@/components/layout/header";

export default async function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  // proxy.ts already guards these routes; checked again here so a page never renders
  // for a session outside the allowlist, whatever the proxy matcher says.
  const session = await auth();
  if (!session?.user || !isAllowed(session.user.login)) redirect("/login");

  const cookieStore = await cookies();
  const defaultOpen =
    cookieStore.get("sidebar_state")?.value === "true" ||
    cookieStore.get("sidebar_state") === undefined;

  const api = getAdminApi();
  // The storefront switcher should not take the whole page down when the API is
  // unreachable; the page itself shows that error.
  let storefronts: StorefrontOption[] = [];
  try {
    storefronts = (await api.overview()).products;
  } catch {
    storefronts = [];
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

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
      <AppSidebar />
      <SidebarInset>
        <SiteHeader
          storefronts={storefronts}
          isFixture={api.isFixture}
          user={{
            login: session.user.login,
            name: session.user.name ?? null,
            image: session.user.image ?? null
          }}
          signOutAction={signOutAction}
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
