"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ExternalLinkIcon,
  GaugeIcon,
  KeyRoundIcon,
  LayersIcon,
  MoreHorizontalIcon,
  PaletteIcon,
  PencilIcon,
  PlugIcon,
  SearchIcon,
  StoreIcon,
  Trash2Icon,
  UsersIcon,
  WorkflowIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { StorefrontSetup } from "@/lib/api/types";
import { SetupProgress } from "@/components/admin/setup-checklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RenameStorefrontButton } from "./rename-storefront-dialog";
import { StoreLimitButton } from "./store-limit-dialog";
import { DeleteStorefrontButton } from "./delete-storefront-dialog";
import { setHighLevelAgency } from "../actions";

/** One storefront as this page lists it. domain: its ready-made shop's address; null when it sells from its own site. */
export type StorefrontRow = {
  id: string;
  name: string;
  tenantCount: number;
  maxTenants: number | null;
  resellerId: string | null;
  resellerName: string | null;
  /** A HighLevel agency's storefront: its sites get the HighLevel site type. */
  highlevelAgency: boolean;
  domain: string | null;
  /** Its setup checklist; null for the platform's own storefront, or an API without checklists. */
  setup: StorefrontSetup | null;
};

/** A storefront's own pages, each opened on it, in the order the sidebar has them. */
const PAGES = [
  { title: "Stores", href: "/stores", icon: StoreIcon },
  { title: "Templates", href: "/versions", icon: LayersIcon },
  { title: "Plugins", href: "/plugins", icon: PlugIcon },
  { title: "Team", href: "/team", icon: UsersIcon },
  { title: "Branding", href: "/branding", icon: PaletteIcon },
  { title: "API Keys", href: "/keys", icon: KeyRoundIcon }
];

type Filter = "all" | "sellers" | "resellers" | "stuck";

const tableClass =
  "[&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)";

export function StorefrontsTable({ rows }: { rows: StorefrontRow[] }) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const sellers = rows.filter((r) => !r.resellerId).length;
  const stuck = rows.filter((r) => r.setup?.stuck).length;
  const q = query.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (filter === "all" || (filter === "stuck" ? !!r.setup?.stuck : filter === "sellers" ? !r.resellerId : !!r.resellerId)) &&
      (!q || [r.name, r.resellerName ?? "", r.domain ?? ""].some((v) => v.toLowerCase().includes(q)))
  );

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b p-(--card-spacing) sm:flex-row sm:items-center sm:justify-between">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={filter}
          onValueChange={(value) => value && setFilter(value as Filter)}
          aria-label="Show"
          className="max-w-full flex-wrap justify-start">
          <ToggleGroupItem value="all" className="px-3">
            All <Count n={rows.length} />
          </ToggleGroupItem>
          <ToggleGroupItem value="sellers" className="px-3">
            Sellers <Count n={sellers} />
          </ToggleGroupItem>
          <ToggleGroupItem value="resellers" className="px-3">
            <span className="sm:hidden">Reseller-run</span>
            <span className="max-sm:hidden">Reseller storefronts</span>
            <Count n={rows.length - sellers} />
          </ToggleGroupItem>
          {stuck > 0 && (
            <ToggleGroupItem value="stuck" className="px-3">
              Stuck <Count n={stuck} />
            </ToggleGroupItem>
          )}
        </ToggleGroup>
        <InputGroup className="sm:max-w-64">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search storefronts"
            placeholder="Search storefronts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>
      </div>
      <Table className={tableClass}>
        <TableHeader>
          <TableRow>
            <TableHead>Storefront</TableHead>
            <TableHead className="max-md:hidden">Account</TableHead>
            <TableHead className="w-44 max-lg:hidden">Setup</TableHead>
            <TableHead className="w-44 max-sm:hidden">Stores</TableHead>
            <TableHead className="w-12 text-end sm:w-28">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                No storefronts match.
              </TableCell>
            </TableRow>
          )}
          {shown.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function Count({ n }: { n: number }) {
  return <span className="text-muted-foreground ms-1 tabular-nums">{n}</span>;
}

function Row({ row }: { row: StorefrontRow }) {
  const q = `?product=${encodeURIComponent(row.id)}`;
  // Which dialog the row's menu opened; the key remounts it so it starts from the saved values each time.
  const [dialog, setDialog] = React.useState<{ kind: "rename" | "limit" | "delete"; n: number } | null>(null);
  const control = (kind: "rename" | "limit" | "delete") => ({
    open: dialog?.kind === kind,
    onOpenChange: (open: boolean) => setDialog(open ? { kind, n: (dialog?.n ?? 0) + 1 } : null)
  });

  return (
    <TableRow className="h-16">
      <TableCell className="whitespace-normal">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
            {row.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <Link href={`/stores${q}`} className="block truncate py-0.5 font-medium hover:underline">
              {row.name}
            </Link>
            {row.domain ? (
              <a
                href={`https://${row.domain}`}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground inline-flex max-w-full items-center gap-1 text-xs">
                <span className="truncate">{row.domain}</span>
                <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
              </a>
            ) : (
              <p className="text-muted-foreground text-xs">Sells from its own website</p>
            )}
            {/* The columns hidden on a phone, under the name instead. */}
            <p className="text-muted-foreground mt-0.5 text-xs sm:hidden">
              {row.resellerId ? `Reseller: ${row.resellerName ?? "unnamed"}` : "Seller"} · <StoreCount row={row} />
            </p>
            {row.setup && (
              <p className="text-muted-foreground mt-0.5 text-xs lg:hidden">
                Setup {row.setup.done} of {row.setup.total}
                {row.setup.stuck && <span className="font-medium text-rose-700 dark:text-rose-400"> · Stuck</span>}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="max-md:hidden">
        {row.resellerId ? (
          <Badge variant="info" asChild>
            <Link href={`/resellers/${row.resellerId}`}>Reseller · {row.resellerName ?? "unnamed"}</Link>
          </Badge>
        ) : (
          <Badge variant="outline">Seller</Badge>
        )}
      </TableCell>
      <TableCell className="max-lg:hidden">
        {row.setup ? (
          <Link href={`/${q}`} className="block rounded-md hover:opacity-80" title={row.setup.next ? `Next: ${row.setup.next}` : "Set up"}>
            <SetupProgress setup={row.setup} />
            <p className="text-muted-foreground mt-1 truncate text-xs">{row.setup.next ? `Next: ${row.setup.next}` : "Every step done"}</p>
          </Link>
        ) : (
          <span className="text-muted-foreground text-xs">Not tracked</span>
        )}
      </TableCell>
      <TableCell className="max-sm:hidden">
        <StoreMeter row={row} />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button variant="outline" size="sm" asChild className="max-sm:hidden">
            <Link href={`/stores${q}`}>
              Open <ArrowRightIcon />
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <span className="sr-only">More for {row.name}</span>
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">Go to</DropdownMenuLabel>
              <DropdownMenuGroup>
                {PAGES.map((page) => (
                  <DropdownMenuItem key={page.href} asChild>
                    <Link href={`${page.href}${q}`}>
                      <page.icon /> {page.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => control("rename").onOpenChange(true)}>
                <PencilIcon /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => control("limit").onOpenChange(true)}>
                <GaugeIcon /> Store limit
              </DropdownMenuItem>
              <HighLevelAgencyItem productId={row.id} on={row.highlevelAgency} />
              {row.tenantCount === 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => control("delete").onOpenChange(true)}>
                    <Trash2Icon /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <RenameStorefrontButton key={`rename-${dialog?.n}`} productId={row.id} name={row.name} control={control("rename")} />
        <StoreLimitButton
          key={`limit-${dialog?.n}`}
          productId={row.id}
          maxTenants={row.maxTenants}
          tenantCount={row.tenantCount}
          control={control("limit")}
        />
        {row.tenantCount === 0 && <DeleteStorefrontButton productId={row.id} name={row.name} control={control("delete")} />}
      </TableCell>
    </TableRow>
  );
}

/**
 * "HighLevel agency": its sites get the HighLevel site type (HighLevel's own plugin, no Fluent CRM, forms or shop).
 * Turning it on also moves its sites that have no site type, which have every plugin on.
 */
function HighLevelAgencyItem({ productId, on }: { productId: string; on: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  return (
    <DropdownMenuCheckboxItem
      checked={on}
      disabled={pending}
      onCheckedChange={(next) =>
        startTransition(async () => {
          const result = await setHighLevelAgency(productId, next === true);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success(
            next
              ? "HighLevel agency: its sites get the HighLevel site type"
              : "Not a HighLevel agency: new sites need a site type"
          );
          router.refresh();
        })
      }>
      <WorkflowIcon /> HighLevel agency
    </DropdownMenuCheckboxItem>
  );
}

function StoreCount({ row }: { row: StorefrontRow }) {
  return (
    <span className="tabular-nums">
      {row.tenantCount}
      {row.maxTenants !== null ? ` of ${row.maxTenants}` : ""} {row.maxTenants === null && row.tenantCount === 1 ? "store" : "stores"}
    </span>
  );
}

/** Its stores, and how much of its limit they use; over the limit shows in red. */
function StoreMeter({ row }: { row: StorefrontRow }) {
  if (row.maxTenants === null) {
    return (
      <div className="text-sm">
        <StoreCount row={row} />
        <p className="text-muted-foreground text-xs">No limit</p>
      </div>
    );
  }
  const over = row.tenantCount > row.maxTenants;
  const share = row.maxTenants === 0 ? 100 : Math.min(100, Math.round((row.tenantCount / row.maxTenants) * 100));
  return (
    <div className="space-y-1.5 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <StoreCount row={row} />
        {over && <span className="text-destructive text-xs font-medium">Over limit</span>}
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div className={cn("h-full rounded-full", over ? "bg-destructive" : "bg-foreground/50")} style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}
