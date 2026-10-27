"use client";

import { CheckIcon, ChevronsUpDown } from "lucide-react";
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

export type StorefrontOption = { id: string; name: string; tenantCount: number };

/** Each storefront gets a dot color by its place in the list; "All storefronts" is gray. */
const DOTS = [
  "bg-gradient-to-br from-violet-500 to-purple-700",
  "bg-gradient-to-br from-amber-400 to-orange-600",
  "bg-gradient-to-br from-sky-400 to-blue-600",
  "bg-gradient-to-br from-emerald-400 to-green-600"
];
const ALL_DOT = "bg-gradient-to-br from-zinc-300 to-zinc-500";

function Dot({ index, className }: { index: number; className: string }) {
  return <span className={cn("shrink-0 rounded-full", index < 0 ? ALL_DOT : DOTS[index % DOTS.length], className)} />;
}

function Option({
  index,
  name,
  count,
  checked,
  onSelect
}: {
  index: number;
  name: string;
  /** Left out where the store count isn't known (a customer's own storefronts). */
  count?: number;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem onSelect={onSelect} className="gap-3 py-2">
      <Dot index={index} className="size-6" />
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
  const selectedIndex = storefronts.findIndex((s) => s.id === selectedId);
  const selected = selectedIndex >= 0 ? storefronts[selectedIndex] : null;

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
          <Dot index={selectedIndex} className="size-4" />
          <span className="hidden font-medium md:inline">{selected ? selected.name : "All storefronts"}</span>
          <ChevronsUpDown className="text-muted-foreground size-3.5!" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Storefronts</DropdownMenuLabel>
        <Option
          index={-1}
          name="All storefronts"
          count={storefronts.reduce((sum, s) => sum + s.tenantCount, 0)}
          checked={!selected}
          onSelect={() => select(null)}
        />
        {storefronts.length > 0 && <DropdownMenuSeparator />}
        {storefronts.map((storefront, index) => (
          <Option
            key={storefront.id}
            index={index}
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
  const activeIndex = memberships.findIndex((m) => m.active);
  const active = memberships[activeIndex];

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
          <Dot index={activeIndex} className="size-4" />
          <span className="hidden font-medium md:inline">{active?.productName ?? "Choose a storefront"}</span>
          <ChevronsUpDown className="text-muted-foreground size-3.5!" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Your storefronts</DropdownMenuLabel>
        {memberships.map((m, index) => (
          <Option
            key={m.productId}
            index={index}
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
