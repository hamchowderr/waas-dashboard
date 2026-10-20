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

/** pendingApplications: shown beside Applications when some are waiting (platform admin only). */
export function AppSidebar({ isAdmin, pendingApplications = 0 }: { isAdmin: boolean; pendingApplications?: number }) {
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
                <BrandMark />
                <span className="text-foreground font-semibold">AnyPress</span>
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
    </Sidebar>
  );
}
