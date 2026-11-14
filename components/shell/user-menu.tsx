"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { signOut } from "@/lib/auth-client";
import { useStartTour } from "@/components/shell/dashboard-tour";
import { AppearancePanel } from "@/components/shell/appearance-panel";
import {
  BookTextIcon,
  ChevronsUpDownIcon,
  CircleHelpIcon,
  CompassIcon,
  LogOutIcon,
  MoonIcon,
  SlidersHorizontalIcon,
  type LucideIcon
} from "lucide-react";

/** `detail`: the GitHub login or email, and for a customer their storefront and role. */
export type SignedInUser = { name: string; detail: string; image: string | null };

/** Where someone on the platform's own look gets help; a branded storefront passes its own support address. */
const SUPPORT_EMAIL = "support@anypress.io";
const DOCS_URL = "https://shop.anypress.io/docs/";

/**
 * The signed-in person at the bottom of the sidebar, and the menu it opens: Notifications, Team, Branding,
 * Appearance, dark mode, the tour, help and sign out.
 */
export function UserMenu({
  user,
  supportEmail,
  links = []
}: {
  user: SignedInUser;
  supportEmail?: string | null;
  /** The account's own pages (Notifications, Team, Branding), listed above Appearance. */
  links?: { title: string; icon: LucideIcon; href: string }[];
}) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const startTour = useStartTour();
  const { isMobile } = useSidebar();
  const [appearanceOpen, setAppearanceOpen] = React.useState(false);
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const help = supportEmail ?? SUPPORT_EMAIL;

  async function leave() {
    try {
      await signOut();
    } catch {
      // Signed out on the server already, or the API is down: either way, go to sign-in.
    }
    router.replace("/login");
    router.refresh();
  }

  const fallback = user.name.slice(0, 2).toUpperCase();
  const avatar = (
    <Avatar className="size-8 rounded-lg">
      {user.image && <AvatarImage src={user.image} alt={user.name} />}
      <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
    </Avatar>
  );

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                aria-label="Account menu"
                data-tour-step-id="account-menu"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                {avatar}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="text-foreground truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">{user.detail}</span>
                </div>
                <ChevronsUpDownIcon className="ms-auto size-4" aria-hidden />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-60" side={isMobile ? "top" : "right"} align="end" sideOffset={isMobile ? 8 : 28}>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1.5 py-2 text-left text-sm">
                  {avatar}
                  <div className="grid flex-1 leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="text-muted-foreground truncate text-xs">{user.detail}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">Settings</DropdownMenuLabel>
              <DropdownMenuGroup>
                {links.map((link) => (
                  <MenuItem key={link.href} icon={link.icon} href={link.href}>
                    {link.title}
                  </MenuItem>
                ))}
                <MenuItem icon={SlidersHorizontalIcon} onSelect={() => setAppearanceOpen(true)}>
                  Appearance
                </MenuItem>
                {mounted && (
                  <MenuItem
                    icon={MoonIcon}
                    onSelect={(event) => {
                      // Keep the menu open while flipping the theme.
                      event.preventDefault();
                      setTheme(theme === "dark" ? "light" : "dark");
                    }}>
                    Dark Mode
                    <Switch checked={theme === "dark"} className="ms-auto" />
                  </MenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <MenuItem icon={CompassIcon} onSelect={startTour}>
                  Take the Tour
                </MenuItem>
                <MenuItem icon={BookTextIcon} href={DOCS_URL} external>
                  Guides and Docs
                </MenuItem>
                <MenuItem icon={CircleHelpIcon} href={`mailto:${help}`} external>
                  Get Help
                  <span className="text-muted-foreground ms-auto max-w-32 truncate text-xs">{help}</span>
                </MenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <MenuItem icon={LogOutIcon} onSelect={() => void leave()}>
                Sign Out
              </MenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <AppearancePanel open={appearanceOpen} onOpenChange={setAppearanceOpen} />
    </>
  );
}

/** A menu row: its icon, then its label. */
function MenuItem({
  icon: Icon,
  href,
  external = false,
  onSelect,
  children
}: {
  icon: LucideIcon;
  href?: string;
  /** A link out of the dashboard (docs, email): a plain link, opened in a new tab when it is a web page. */
  external?: boolean;
  onSelect?: (event: Event) => void;
  children: React.ReactNode;
}) {
  const icon = <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />;
  if (!href) {
    return (
      <DropdownMenuItem onSelect={onSelect}>
        {icon}
        {children}
      </DropdownMenuItem>
    );
  }
  return (
    <DropdownMenuItem asChild>
      {external ? (
        <a href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
          {icon}
          {children}
        </a>
      ) : (
        <Link href={href}>
          {icon}
          {children}
        </Link>
      )}
    </DropdownMenuItem>
  );
}
