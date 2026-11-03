"use client";

import * as React from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MyStorefrontSwitcher,
  StorefrontSwitcher,
  type StorefrontMembership,
  type StorefrontOption
} from "@/components/shell/storefront-switcher";

export function SiteHeader({
  storefronts,
  isFixture,
  memberships,
  viewOnly = false
}: {
  /** Null hides the storefront switcher: a customer sees their own storefront only. */
  storefronts: StorefrontOption[] | null;
  isFixture: boolean;
  /** A customer's storefronts; with more than one, a switcher between them. */
  memberships: StorefrontMembership[];
  /** A "Can view" member: buttons that change things are refused, so say so up front. */
  viewOnly?: boolean;
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
        {memberships.length > 1 && <MyStorefrontSwitcher memberships={memberships} />}
        <div className="ms-auto flex items-center gap-1 sm:gap-2">
          {viewOnly && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary">View only</Badge>
              </TooltipTrigger>
              <TooltipContent>You can look around but not change anything. An owner or admin can change your role on the Team page.</TooltipContent>
            </Tooltip>
          )}
          {isFixture && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="warning">Sample data</Badge>
              </TooltipTrigger>
              <TooltipContent>WAAS_API_FIXTURES=1: these pages show built-in sample data, not the live API.</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </header>
  );
}
