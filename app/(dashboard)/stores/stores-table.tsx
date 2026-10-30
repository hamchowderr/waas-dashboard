"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { GitBranchIcon, StoreIcon } from "lucide-react";

import { SortableHeader } from "@/components/admin/sortable-header";
import type { TableFacet } from "@/components/admin/table-filters";
import { AdminDataTable, type TableTab } from "@/components/admin/data-table";
import { OnHoldBadge, StatusBadge, SuspendedBadge } from "@/components/admin/status-badge";
import { StatusCode, type Tenant } from "@/lib/api/types";
import { formatAgo, formatDate } from "@/lib/format";
import { pickStorefront } from "@/lib/auth-client";
import type { StorefrontMembership } from "@/components/shell/storefront-switcher";

const columnLabels: Record<string, string> = {
  name: "Store",
  productName: "Storefront",
  versionName: "Version",
  mainDomain: "Domain",
  statusCode: "Status",
  latestBackupAt: "Last backup",
  dateCreated: "Created"
};

const tabs: TableTab<Tenant>[] = [
  { value: "ready", label: "Ready", match: (t) => t.statusCode === StatusCode.Done && !t.isSuspended },
  { value: "pending", label: "In progress", match: (t) => t.statusCode === StatusCode.Pending || t.statusCode === StatusCode.Removing },
  { value: "failed", label: "Failed", match: (t) => t.statusCode === StatusCode.Failed },
  { value: "suspended", label: "Suspended", match: (t) => t.isSuspended }
];

function readField(row: Tenant, path: string): unknown {
  if (path === "search")
    return `${row.name} ${row.externalId} ${row.id} ${row.mainDomain ?? ""}`;
  return row[path as keyof Tenant];
}

/** onOpen: runs when a store's name is clicked, before the link is followed (it may follow it itself). */
function storeColumns(onOpen: (tenant: Tenant, event: React.MouseEvent) => void): ColumnDef<Tenant>[] {
  return [

  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column}>Store</SortableHeader>,
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          href={`/stores/${row.original.id}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(row.original, event);
          }}
          className="hover:text-primary truncate font-medium hover:underline">
          {row.original.name}
        </Link>
      </div>
    )
  },
  { accessorKey: "productName", header: "Storefront" },
  { accessorKey: "versionName", header: "Version" },
  {
    accessorKey: "mainDomain",
    header: "Domain",
    cell: ({ row }) => {
      const others = row.original.domainCount - 1;
      return (
        <div className="flex items-center gap-1.5">
          <span className="max-w-64 truncate">{row.original.mainDomain ?? "—"}</span>
          {others > 0 && <span className="text-muted-foreground text-xs">+{others}</span>}
        </div>
      );
    }
  },
  {
    accessorKey: "statusCode",
    header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <StatusBadge statusCode={row.original.statusCode} />
        {row.original.isSuspended && <SuspendedBadge />}
        {row.original.onHold && <OnHoldBadge />}
      </div>
    )
  },
  {
    accessorKey: "latestBackupAt",
    header: ({ column }) => <SortableHeader column={column}>Last backup</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap">{formatAgo(row.original.latestBackupAt)}</span>
    )
  },
  {
    accessorKey: "dateCreated",
    header: ({ column }) => <SortableHeader column={column}>Created</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap">{formatDate(row.original.dateCreated)}</span>
    )
  }
  ];
}

/**
 * storefronts: on a reseller team's list of all its stores, the storefronts it can switch to. A store on
 * another storefront opens after switching to that storefront, since its pages are about the one picked.
 */
export function StoresTable({
  tenants,
  initialTab,
  storefronts
}: {
  tenants: Tenant[];
  initialTab?: string;
  storefronts?: StorefrontMembership[];
}) {
  const router = useRouter();
  const table = useMemo(() => {
    const otherStorefront = (tenant: Tenant) => storefronts?.find((s) => s.productId === tenant.productId && !s.active);
    // Opens a store, switching to its storefront first when it is on another one.
    const openStore = (tenant: Tenant) => {
      const storefront = otherStorefront(tenant);
      if (!storefront) return router.push(`/stores/${tenant.id}`);
      pickStorefront(storefront).then(
        () => {
          router.push(`/stores/${tenant.id}`);
          router.refresh();
        },
        (e: Error) => toast.error(e.message)
      );
    };
    return {
      openStore,
      list: storeColumns((tenant, event) => {
        if (!otherStorefront(tenant)) return;
        event.preventDefault();
        openStore(tenant);
      })
    };
  }, [router, storefronts]);
  const unique = (values: string[]) => [...new Set(values)].sort();

  const facets: TableFacet[] = [
    {
      id: "productName",
      label: "Storefront",
      options: unique(tenants.map((t) => t.productName)).map((v) => ({ value: v, label: v })),
      icon: <StoreIcon />
    },
    {
      id: "versionName",
      label: "Version",
      options: unique(tenants.map((t) => t.versionName)).map((v) => ({ value: v, label: v })),
      icon: <GitBranchIcon />
    }
  ];

  return (
    <AdminDataTable
      data={tenants}
      columns={table.list}
      columnLabels={columnLabels}
      getRowId={(t) => t.id}
      searchPlaceholder="Name, subscription, domain..."
      facets={facets}
      readField={readField}
      tabs={tabs}
      tabCounts
      initialTab={initialTab && tabs.some((t) => t.value === initialTab) ? initialTab : "all"}
      initialSorting={[{ id: "dateCreated", desc: true }]}
      emptyText="No stores match these filters."
      onRowClick={table.openStore}
      cardFields={["mainDomain", "statusCode"]}
    />
  );
}
