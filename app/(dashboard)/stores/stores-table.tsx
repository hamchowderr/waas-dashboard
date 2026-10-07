"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { ArchiveIcon, GitBranchIcon, GlobeIcon, SearchIcon, StoreIcon } from "lucide-react";

import { SortableHeader } from "@/components/table-filter-helpers";
import { AdminDataTable, type TableTab } from "@/components/admin/data-table";
import { StatusBadge, SuspendedBadge } from "@/components/admin/status-badge";
import type { FilterField } from "@/components/ui/filters/filters-types";
import { StatusCode, type Tenant } from "@/lib/api/types";
import { formatAgo, formatDate, statusMeta } from "@/lib/format";

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
  { value: "pending", label: "Pending", match: (t) => t.statusCode === StatusCode.Pending || t.statusCode === StatusCode.Removing },
  { value: "failed", label: "Failed", match: (t) => t.statusCode === StatusCode.Failed },
  { value: "suspended", label: "Suspended", match: (t) => t.isSuspended }
];

function readField(row: Tenant, path: string): unknown {
  if (path === "search")
    return `${row.name} ${row.externalId} ${row.id} ${row.mainDomain ?? ""}`;
  return row[path as keyof Tenant];
}

const columns: ColumnDef<Tenant>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column}>Store</SortableHeader>,
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          href={`/stores/${row.original.id}`}
          onClick={(event) => event.stopPropagation()}
          className="hover:text-primary truncate font-medium hover:underline">
          {row.original.name}
        </Link>
        <div className="text-muted-foreground truncate font-mono text-xs">{row.original.externalId}</div>
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

export function StoresTable({ tenants }: { tenants: Tenant[] }) {
  const router = useRouter();
  const unique = (values: string[]) => [...new Set(values)].sort();

  const filterFields: FilterField[] = [
    { id: "search", label: "Search", type: "text", placeholder: "Name, subscription, domain...", icon: <SearchIcon /> },
    {
      id: "productName",
      label: "Storefront",
      type: "select",
      defaultOperator: "is_any_of",
      options: unique(tenants.map((t) => t.productName)).map((v) => ({ value: v, label: v })),
      searchable: false,
      icon: <StoreIcon />
    },
    {
      id: "versionName",
      label: "Version",
      type: "select",
      defaultOperator: "is_any_of",
      options: unique(tenants.map((t) => t.versionName)).map((v) => ({ value: v, label: v })),
      searchable: false,
      icon: <GitBranchIcon />
    },
    {
      id: "statusCode",
      label: "Status",
      type: "select",
      defaultOperator: "is_any_of",
      options: Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label })),
      searchable: false,
      icon: <ArchiveIcon />
    },
    { id: "mainDomain", label: "Domain", type: "text", placeholder: "example.com", icon: <GlobeIcon /> }
  ];

  return (
    <AdminDataTable
      data={tenants}
      columns={columns}
      columnLabels={columnLabels}
      getRowId={(t) => t.id}
      filterFields={filterFields}
      readField={readField}
      tabs={tabs}
      tabCounts
      initialSorting={[{ id: "dateCreated", desc: true }]}
      emptyText="No stores match these filters."
      onRowClick={(t) => router.push(`/stores/${t.id}`)}
    />
  );
}
