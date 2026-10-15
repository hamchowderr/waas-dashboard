"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { MoonIcon, PanelLeftClose, PanelLeftOpen, SunIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AppearancePanel } from "@/components/shell/appearance-panel";
import { StorefrontSwitcher, type StorefrontOption } from "@/components/shell/storefront-switcher";
import { UserMenu, type SignedInUser, type StorefrontMembership } from "@/components/shell/user-menu";

export function SiteHeader({
  storefronts,
  user,
  isFixture,
  memberships
}: {
  /** Null hides the storefront switcher: a customer sees their own storefront only. */
  storefronts: StorefrontOption[] | null;
  user: SignedInUser;
  isFixture: boolean;
  memberships: StorefrontMembership[];
}) {
  const { open, toggleSidebar } = useSidebar();

  return (
    <header className="bg-background/40 sticky top-0 z-50 flex h-(--header-height) shrink-0 items-center gap-2 border-b backdrop-blur-md md:rounded-t-xl">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          {open ? <PanelLeftClose /> : <PanelLeftOpen />}
          <span className="sr-only">Toggle sidebar</span>
        </Button>
        {storefronts && <StorefrontSwitcher storefronts={storefronts} />}
        <div className="ms-auto flex items-center gap-1 sm:gap-2">
          {isFixture && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="warning">Sample data</Badge>
              </TooltipTrigger>
              <TooltipContent>WAAS_API_FIXTURES=1: these pages show built-in sample data, not the live API.</TooltipContent>
            </Tooltip>
          )}
          <ModeToggle />
          <AppearancePanel />
          <Separator orientation="vertical" className="mx-1 self-center data-[orientation=vertical]:h-4 sm:mx-2" />
          <UserMenu user={user} memberships={memberships} />
        </div>
      </div>
    </header>
  );
}

/** Light/dark switch. Renders after mount, since the server can't know the saved mode. */
function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  if (!mounted) return null;
  const dark = theme === "dark";
  return (
    <Button variant="ghost" size="icon-sm" onClick={() => setTheme(dark ? "light" : "dark")}>
      {dark ? <SunIcon /> : <MoonIcon />}
      <span className="sr-only">{dark ? "Switch to light mode" : "Switch to dark mode"}</span>
    </Button>
  );
}
