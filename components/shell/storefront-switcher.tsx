"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDown, LayersIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { pickStorefront } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export type StorefrontOption = { id: string; name: string; tenantCount: number; markUrl?: string | null };

/**
 * A storefront's uploaded icon or logo (Branding page); without one, its first letter on a quiet tile.
 * "All storefronts" (no storefront) is a stack.
 */
function Mark({ storefront, className }: { storefront: { name: string; markUrl?: string | null } | null; className: string }) {
  // Remembers which picture failed, so picking another storefront tries its own.
  const [brokenUrl, setBrokenUrl] = React.useState<string | null>(null);
  const url = storefront?.markUrl;
  if (url && url !== brokenUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        aria-hidden
        className={cn("bg-background shrink-0 rounded-md border object-contain", className)}
        onError={() => setBrokenUrl(url)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "bg-muted text-muted-foreground flex shrink-0 items-center justify-center rounded-md border text-[0.6875rem] font-semibold",
        className
      )}>
      {storefront ? (storefront.name.trim().charAt(0).toUpperCase() || "?") : <LayersIcon className="size-3/5" />}
    </span>
  );
}

function Option({
  storefront,
  name,
  count,
  checked,
  onSelect
}: {
  /** Null for "All storefronts". */
  storefront: { name: string; markUrl?: string | null } | null;
  name: string;
  /** Left out where the store count isn't known (a customer's own storefronts). */
  count?: number;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem onSelect={onSelect} className="gap-3 py-2">
      <Mark storefront={storefront} className="size-7" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{name}</span>
        {count !== undefined && <span className="text-muted-foreground text-xs">{count} stores</span>}
      </span>
      {checked && <CheckIcon className="ms-auto" />}
    </DropdownMenuItem>
  );
}

/**
 * Picks which storefront (product) the pages show. The choice lives in the URL as
 * ?product=<id>, so it survives reloads and can be shared as a link.
 */
export function StorefrontSwitcher({ storefronts }: { storefronts: StorefrontOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("product");
  const selected = storefronts.find((s) => s.id === selectedId) ?? null;

  const select = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("product", id);
    else params.delete("product");
    const text = params.toString();
    // A store's page belongs to one storefront: switching from it goes back to the list.
    const path = pathname.startsWith("/stores/") ? "/stores" : pathname;
    router.push(text ? `${path}?${text}` : path);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" data-tour-step-id="storefront-picker">
          <Mark storefront={selected} className="size-5" />
          <span className="font-medium max-md:sr-only">{selected ? selected.name : "All storefronts"}</span>
          <ChevronsUpDown className="text-muted-foreground size-3.5!" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Storefronts</DropdownMenuLabel>
        <Option
          storefront={null}
          name="All storefronts"
          count={storefronts.reduce((sum, s) => sum + s.tenantCount, 0)}
          checked={!selected}
          onSelect={() => select(null)}
        />
        {storefronts.length > 0 && <DropdownMenuSeparator />}
        {storefronts.map((storefront) => (
          <Option
            key={storefront.id}
            storefront={storefront}
            name={storefront.name}
            count={storefront.tenantCount}
            checked={storefront.id === selectedId}
            onSelect={() => select(storefront.id)}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Storefronts a customer belongs to, for MyStorefrontSwitcher. */
export type StorefrontMembership = { organizationId: string; productId: string; productName: string; active: boolean };

/**
 * For someone on more than one storefront's team (a reseller's team): which one the pages show. Unlike the
 * platform admin's switcher it changes the storefront they act for, so it goes back to the Overview.
 */
export function MyStorefrontSwitcher({ memberships }: { memberships: StorefrontMembership[] }) {
  const router = useRouter();
  const active = memberships.find((m) => m.active);

  async function switchTo(storefront: StorefrontMembership) {
    try {
      await pickStorefront(storefront);
      router.replace("/");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Mark storefront={active ? { name: active.productName } : null} className="size-5" />
          <span className="hidden font-medium md:inline">{active?.productName ?? "Choose a storefront"}</span>
          <ChevronsUpDown className="text-muted-foreground size-3.5!" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Your storefronts</DropdownMenuLabel>
        {memberships.map((m) => (
          <Option
            key={m.productId}
            storefront={{ name: m.productName }}
            name={m.productName}
            checked={m.active}
            onSelect={() => {
              if (!m.active) void switchTo(m);
            }}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
