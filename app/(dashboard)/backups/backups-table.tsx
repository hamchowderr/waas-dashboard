"use client";

import Link from "next/link";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { SearchIcon, StoreIcon, TagIcon } from "lucide-react";

import { SortableHeader } from "@/components/table-filter-helpers";
import { AdminDataTable, type TableTab } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import type { FilterField } from "@/components/ui/filters/filters-types";
import { StatusCode, type Backup } from "@/lib/api/types";
import { formatBytes, formatDate, formatDateTime } from "@/lib/format";

const columnLabels: Record<string, string> = {
  tenantName: "Store",
  productName: "Storefront",
  reason: "Reason",
  sizeBytes: "Size",
  dateCreated: "Taken",
  expiresAt: "Expires",
  statusCode: "Status"
};

const tabs: TableTab<Backup>[] = [
  { value: "live", label: "Live stores", match: (b) => !b.tenantDeletedAt },
  { value: "deleted", label: "Deleted stores", match: (b) => !!b.tenantDeletedAt },
  { value: "failed", label: "Failed", match: (b) => b.statusCode === StatusCode.Failed }
];

function readField(row: Backup, path: string): unknown {
  if (path === "search") return `${row.tenantName ?? ""} ${row.externalId} ${row.tenantId} ${row.id}`;
  return row[path as keyof Backup];
}

const columns: ColumnDef<Backup>[] = [
  {
    accessorKey: "tenantName",
    header: ({ column }) => <SortableHeader column={column}>Store</SortableHeader>,
    cell: ({ row }) => {
      const b = row.original;
      const name = b.tenantName ?? b.externalId;
      return (
        <div className="min-w-0">
          {b.tenantDeletedAt ? (
            <span className="font-medium">{name}</span>
          ) : (
            <Link href={`/stores/${b.tenantId}`} className="hover:text-primary font-medium hover:underline">
              {name}
            </Link>
          )}
          <div className="text-muted-foreground truncate font-mono text-xs">{b.externalId}</div>
        </div>
      );
    }
  },
  { accessorKey: "productName", header: "Storefront" },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => <span className="capitalize">{row.original.reason}</span>
  },
  {
    accessorKey: "sizeBytes",
    header: ({ column }) => <SortableHeader column={column}>Size</SortableHeader>,
    cell: ({ row }) => <span className="tabular-nums">{formatBytes(row.original.sizeBytes)}</span>
  },
  {
    accessorKey: "dateCreated",
    header: ({ column }) => <SortableHeader column={column}>Taken</SortableHeader>,
    cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.dateCreated)}</span>
  },
  {
    accessorKey: "expiresAt",
    header: ({ column }) => <SortableHeader column={column}>Expires</SortableHeader>,
    cell: ({ row }) =>
      row.original.tenantDeletedAt ? (
        <div className="flex flex-col gap-0.5">
          <span className="whitespace-nowrap">{formatDate(row.original.expiresAt)}</span>
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            Store deleted {formatDate(row.original.tenantDeletedAt)}
          </span>
        </div>
      ) : (
        <span className="text-muted-foreground">Kept while the store exists</span>
      )
  },
  {
    accessorKey: "statusCode",
    header: "Status",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <StatusBadge statusCode={row.original.statusCode} />
        {row.original.tenantDeletedAt && <Badge variant="outline">Store deleted</Badge>}
      </div>
    )
  }
];

export function BackupsTable({ backups }: { backups: Backup[] }) {
  const filterFields: FilterField[] = [
    { id: "search", label: "Search", type: "text", placeholder: "Store, subscription...", icon: <SearchIcon /> },
    {
      id: "productName",
      label: "Storefront",
      type: "select",
      defaultOperator: "is_any_of",
      options: [...new Set(backups.map((b) => b.productName))].sort().map((v) => ({ value: v, label: v })),
      searchable: false,
      icon: <StoreIcon />
    },
    {
      id: "reason",
      label: "Reason",
      type: "select",
      defaultOperator: "is_any_of",
      options: [
        { value: "manual", label: "Manual" },
        { value: "suspend", label: "Suspend" }
      ],
      searchable: false,
      icon: <TagIcon />
    }
  ];

  return (
    <AdminDataTable
      data={backups}
      columns={columns}
      columnLabels={columnLabels}
      getRowId={(b) => b.id}
      filterFields={filterFields}
      readField={readField}
      tabs={tabs}
      tabCounts
      initialSorting={[{ id: "dateCreated", desc: true }]}
      emptyText="No backups match these filters."
    />
  );
}
