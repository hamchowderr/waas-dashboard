"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpenIcon, LifeBuoyIcon } from "lucide-react";

import { useIsTablet } from "@/hooks/use-mobile";
import { useAppearance } from "@/components/appearance-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";
import { BrandMark } from "@/components/shell/brand-mark";
import { CommandSearch } from "@/components/shell/command-search";
import { isCurrent, linkHref, navFor } from "@/components/shell/nav";

/** The storefront's own name, logo and support address (Branding page); absent for the platform's own look. */
export type SidebarBrand = { name: string | null; logoUrl: string | null; supportEmail: string | null };

/** Where a customer on the platform's own look gets help. */
const SUPPORT_EMAIL = "support@anypress.io";
const DOCS_URL = "https://shop.anypress.io/docs/";

/** pendingApplications: shown beside Accounts when some are waiting (platform admin only). */
export function AppSidebar({
  isAdmin,
  isReseller = false,
  pendingApplications = 0,
  brand
}: {
  isAdmin: boolean;
  /** On a reseller's own team: the sidebar has its Reseller account. */
  isReseller?: boolean;
  pendingApplications?: number;
  brand?: SidebarBrand | null;
}) {
  const pathname = usePathname();
  // The storefront picked in the header (platform admin) stays picked from page to page.
  const product = useSearchParams().get("product");
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
        <CommandSearch isAdmin={isAdmin} isReseller={isReseller} product={product} />
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-full [&>[data-slot=scroll-area-viewport]]:scroll-fade">
          {/* One link per section; the section's other pages are tabs at the top of the page. */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navFor(isAdmin, isReseller).map((section) => (
                  <SidebarMenuItem key={section.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={section.title}
                      isActive={section.links.some((link) => isCurrent(pathname, link.href))}>
                      <Link href={linkHref(section.links[0], product)}>
                        <section.icon />
                        <span>{section.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {section.links.some((link) => link.href === "/applications") && pendingApplications > 0 && (
                      <SidebarMenuBadge title="Applications waiting">{pendingApplications}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>
      {brand ? (
        <SidebarFooter className="text-muted-foreground gap-1 px-4 pb-3 text-xs group-data-[collapsible=icon]:hidden">
          {brand.supportEmail && (
            <a href={`mailto:${brand.supportEmail}`} className="hover:text-foreground truncate">
              Help: {brand.supportEmail}
            </a>
          )}
          <span>Powered by AnyPress</span>
        </SidebarFooter>
      ) : (
        !isAdmin && (
          <SidebarFooter className="text-muted-foreground gap-2 px-4 pb-3 text-xs group-data-[collapsible=icon]:hidden">
            <a href={DOCS_URL} target="_blank" rel="noreferrer" className="hover:text-foreground flex items-center gap-2">
              <BookOpenIcon className="size-3.5" aria-hidden />
              Guides and docs
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-foreground flex items-center gap-2 truncate">
              <LifeBuoyIcon className="size-3.5" aria-hidden />
              Help: {SUPPORT_EMAIL}
            </a>
          </SidebarFooter>
        )
      )}
    </Sidebar>
  );
}
