"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

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
import { MotionConfig } from "motion/react";

import { isCurrent, linkHref, navFor, type NavLink } from "@/components/shell/nav";
import * as Animated from "@/components/animated-icons";
import { useIconHover } from "@/components/animated-icons/use-icon-hover";
import { sectionSlug } from "@/components/shell/tours";
import { UserMenu, type SignedInUser } from "@/components/shell/user-menu";

/** The storefront's own name, logo and support address (Branding page); absent for the platform's own look. */
export type SidebarBrand = { name: string | null; logoUrl: string | null; supportEmail: string | null };

/** pendingApplications: shown beside Accounts when some are waiting (platform admin only). */
export function AppSidebar({
  isAdmin,
  isReseller = false,
  pendingApplications = 0,
  brand,
  user
}: {
  isAdmin: boolean;
  /** On a reseller's own team: the sidebar has its Reseller account. */
  isReseller?: boolean;
  pendingApplications?: number;
  brand?: SidebarBrand | null;
  /** The signed-in person, at the bottom with their account menu. */
  user: SignedInUser;
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
    // Icons stay still for anyone who asked their device for less motion.
    <MotionConfig reducedMotion="user">
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
            {/* Every page is a link, in small groups with a heading (Overview stands alone at the top). */}
            <div data-tour-step-id="sidebar-nav">
              {navFor(isAdmin, isReseller).map((section) => {
                const single = section.links.length === 1 && section.links[0].title === section.title;
                return (
                  <SidebarGroup key={section.title} data-tour-step-id={`group-${sectionSlug(section.title)}`} className="py-1">
                    {!single && <SidebarGroupLabel>{section.title}</SidebarGroupLabel>}
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {section.links.map((link) => (
                          <NavItem
                            key={link.href}
                            link={link}
                            href={linkHref(link, product)}
                            active={isCurrent(pathname, link.href)}
                            badge={link.href === "/applications" && pendingApplications > 0 ? pendingApplications : 0}
                          />
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                );
              })}
            </div>
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter className="border-t">
          {brand && (
            <p className="text-muted-foreground px-2 text-xs group-data-[collapsible=icon]:hidden">Powered by AnyPress</p>
          )}
          <UserMenu user={user} supportEmail={brand?.supportEmail} />
        </SidebarFooter>
      </Sidebar>
    </MotionConfig>
  );
}

/** Each page's animated icon in the sidebar (the same drawing as its plain icon elsewhere). */
const NAV_ICONS: Record<string, Animated.AnimatedIcon> = {
  "/": Animated.GaugeIcon,
  "/stores": Animated.HomeIcon,
  "/backups": Animated.CloudBackupIcon,
  "/jobs": Animated.HistoryIcon,
  "/versions": Animated.LayersIcon,
  "/plugins": Animated.PlugZapIcon,
  "/storefronts": Animated.CartIcon,
  "/applications": Animated.MailboxIcon,
  "/resellers": Animated.HeartHandshakeIcon,
  "/reseller": Animated.HeartHandshakeIcon,
  "/team": Animated.UsersIcon,
  "/branding": Animated.PaletteIcon,
  "/integrations": Animated.BlocksIcon,
  "/keys": Animated.KeyIcon,
  "/webhooks": Animated.WebhookIcon,
  "/requests": Animated.ActivityIcon
};

/** One sidebar link: its icon moves while the row is hovered; the line on what the page is for shows on hover. */
function NavItem({ link, href, active, badge }: { link: NavLink; href: string; active: boolean; badge: number }) {
  const { ref, row } = useIconHover();
  const Icon = NAV_ICONS[link.href];
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        data-tour-step-id={`nav-${sectionSlug(link.title)}`}
        asChild
        tooltip={link.title}
        title={link.description}
        isActive={active}
        {...row}>
        <Link href={href}>
          {Icon ? <Icon ref={ref} size={16} className="flex shrink-0 items-center" aria-hidden /> : <link.icon />}
          <span>{link.title}</span>
        </Link>
      </SidebarMenuButton>
      {badge > 0 && <SidebarMenuBadge title="Applications waiting">{badge}</SidebarMenuBadge>}
    </SidebarMenuItem>
  );
}
