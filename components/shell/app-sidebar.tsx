"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useIsTablet } from "@/hooks/use-mobile";
import { useAppearance } from "@/components/appearance-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";
import { BrandMark } from "@/components/shell/brand-mark";
import { CommandSearch } from "@/components/shell/command-search";
import { isCurrent, navFor } from "@/components/shell/nav";

/** The storefront's own name, logo and support address (Branding page); absent for the platform's own look. */
export type SidebarBrand = { name: string | null; logoUrl: string | null; supportEmail: string | null };

/** pendingApplications: shown beside Applications when some are waiting (platform admin only). */
export function AppSidebar({
  isAdmin,
  pendingApplications = 0,
  brand
}: {
  isAdmin: boolean;
  pendingApplications?: number;
  brand?: SidebarBrand | null;
}) {
  const pathname = usePathname();
  const { appearance } = useAppearance();
  const { isMobile, setOpen, setOpenMobile } = useSidebar();
  const isTablet = useIsTablet();

  // On a phone the sidebar is a drawer: close it once a link has been followed.
  React.useEffect(() => {
    if (isMobile) setOpenMobile(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Collapse when the window narrows to tablet width and open again when it widens. The first
  // render keeps whatever the sidebar cookie restored.
  const wasTablet = React.useRef(isTablet);
  React.useEffect(() => {
    if (wasTablet.current === isTablet) return;
    wasTablet.current = isTablet;
    setOpen(!isTablet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTablet]);

  return (
    <Sidebar collapsible={appearance.sidebarCollapse} variant={appearance.sidebarStyle}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="hover:text-foreground h-10 group-data-[collapsible=icon]:px-0!">
              <Link href="/">
                {brand?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={brand.logoUrl}
                    alt=""
                    className="me-1 h-8 max-w-28 shrink-0 object-contain group-data-[collapsible=icon]:size-8"
                  />
                ) : (
                  <BrandMark />
                )}
                <span className="text-foreground truncate font-semibold">{brand?.name ?? "AnyPress"}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <CommandSearch isAdmin={isAdmin} />
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-full [&>[data-slot=scroll-area-viewport]]:scroll-fade">
          {navFor(isAdmin).map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.links.map((link) => (
                    <SidebarMenuItem key={link.href}>
                      <SidebarMenuButton asChild tooltip={link.title} isActive={isCurrent(pathname, link.href)}>
                        <Link href={link.href}>
                          <link.icon />
                          <span>{link.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {link.href === "/applications" && pendingApplications > 0 && (
                        <SidebarMenuBadge>{pendingApplications}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </ScrollArea>
      </SidebarContent>
      {brand && (
        <SidebarFooter className="text-muted-foreground gap-1 px-4 pb-3 text-xs group-data-[collapsible=icon]:hidden">
          {brand.supportEmail && (
            <a href={`mailto:${brand.supportEmail}`} className="hover:text-foreground truncate">
              Help: {brand.supportEmail}
            </a>
          )}
          <span>Powered by AnyPress</span>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
