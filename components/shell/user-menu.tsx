"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { CheckIcon, LogOutIcon, MoonIcon } from "lucide-react";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import { setActiveOrganization, signOut } from "@/lib/auth-client";

/** `detail`: the GitHub login or email, and for a customer their storefront and role. */
export type SignedInUser = { name: string; detail: string; image: string | null };

/** Storefronts someone belongs to, when there is more than one to switch between. */
export type StorefrontMembership = { organizationId: string; productName: string; active: boolean };

export function UserMenu({ user, memberships = [] }: { user: SignedInUser; memberships?: StorefrontMembership[] }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  async function leave() {
    try {
      await signOut();
    } catch {
      // Signed out on the server already, or the API is down: either way, go to sign-in.
    }
    router.replace("/login");
    router.refresh();
  }

  async function switchTo(organizationId: string) {
    try {
      await setActiveOrganization(organizationId);
      router.replace("/");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const fallback = user.name.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="focus-visible:ring-ring/50 cursor-pointer rounded-full outline-none focus-visible:ring-3">
        <Avatar className="pointer-coarse:size-11">
          {user.image && <AvatarImage src={user.image} alt={user.name} />}
          <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel className="p-0">
          <div className="flex items-center gap-3 px-1.5 py-2 text-left text-sm">
            <Avatar className="size-9">
              {user.image && <AvatarImage src={user.image} alt={user.name} />}
              <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{user.name}</span>
              <span className="text-muted-foreground truncate text-xs">{user.detail}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {mounted && (
            <DropdownMenuItem
              onSelect={(event) => {
                // Keep the menu open while flipping the theme.
                event.preventDefault();
                setTheme(theme === "dark" ? "light" : "dark");
              }}>
              <MoonIcon className="text-muted-foreground" />
              Dark mode
              <Switch checked={theme === "dark"} className="ms-auto" />
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        {memberships.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">Storefronts</DropdownMenuLabel>
              {memberships.map((m) => (
                <DropdownMenuItem key={m.organizationId} disabled={m.active} onSelect={() => void switchTo(m.organizationId)}>
                  {m.productName}
                  {m.active && <CheckIcon className="ms-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void leave()}>
          <LogOutIcon className="text-muted-foreground" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
