"use client";

import Link from "next/link";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { GlobeIcon, SearchIcon, StoreIcon, TagIcon } from "lucide-react";

import { SortableHeader } from "@/components/table-filter-helpers";
import { AdminDataTable, type TableTab } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import type { FilterField } from "@/components/ui/filters/filters-types";
import type { ApiRequest } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

const columnLabels: Record<string, string> = {
  at: "Time",
  path: "Request",
  status: "Status",
  tenantName: "Store",
  productName: "Storefront",
  durationMs: "Took",
  ip: "Caller"
};

const tabs: TableTab<ApiRequest>[] = [
  { value: "errors", label: "Errors", match: (r) => r.status >= 400 },
  { value: "v1", label: "Storefront calls", match: (r) => r.source === "v1" },
  { value: "admin", label: "Admin changes", match: (r) => r.source === "admin" }
];

function readField(row: ApiRequest, path: string): unknown {
  if (path === "search")
    return `${row.path} ${row.query ?? ""} ${row.tenantName ?? ""} ${row.externalId ?? ""} ${row.error ?? ""} ${row.ip ?? ""} ${row.apiKeyId ?? ""}`;
  return row[path as keyof ApiRequest];
}

function StatusCodeBadge({ status }: { status: number }) {
  const variant = status >= 500 ? "destructive" : status >= 400 ? "warning" : "success";
  return (
    <Badge variant={variant} className="tabular-nums">
      {status}
    </Badge>
  );
}

const columns: ColumnDef<ApiRequest>[] = [
  {
    accessorKey: "at",
    header: ({ column }) => <SortableHeader column={column}>Time</SortableHeader>,
    cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.at)}</span>
  },
  {
    accessorKey: "path",
    header: "Request",
    cell: ({ row }) => {
      const r = row.original;
      return (
        <div className="max-w-md min-w-0">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="font-mono">
              {r.method}
            </Badge>
            <span className="truncate font-mono text-xs">{r.path}</span>
          </div>
          {r.query && <div className="text-muted-foreground truncate font-mono text-xs">?{r.query}</div>}
          {r.error && <div className="text-destructive line-clamp-2 text-xs whitespace-normal">{r.error}</div>}
        </div>
      );
    }
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
    cell: ({ row }) => <StatusCodeBadge status={row.original.status} />
  },
  {
    accessorKey: "tenantName",
    header: "Store",
    cell: ({ row }) => {
      const r = row.original;
      if (!r.tenantId) return <span className="text-muted-foreground">{r.externalId ?? "None"}</span>;
      return (
        <Link href={`/stores/${r.tenantId}`} className="hover:text-primary font-medium hover:underline">
          {r.tenantName ?? "Deleted store"}
        </Link>
      );
    }
  },
  {
    accessorKey: "productName",
    header: "Storefront",
    cell: ({ row }) => row.original.productName ?? <span className="text-muted-foreground">{row.original.source === "admin" ? "Admin" : "Unknown key"}</span>
  },
  {
    accessorKey: "durationMs",
    header: ({ column }) => <SortableHeader column={column}>Took</SortableHeader>,
    cell: ({ row }) => <span className="tabular-nums whitespace-nowrap">{row.original.durationMs} ms</span>
  },
  {
    accessorKey: "ip",
    header: "Caller",
    cell: ({ row }) => (
      <div className="max-w-44 min-w-0">
        <div className="font-mono text-xs">{row.original.ip ?? "Unknown"}</div>
        {row.original.userAgent && (
          <div className="text-muted-foreground truncate text-xs" title={row.original.userAgent}>
            {row.original.userAgent}
          </div>
        )}
      </div>
    )
  },
];

export function RequestsTable({ requests }: { requests: ApiRequest[] }) {
  const filterFields: FilterField[] = [
    { id: "search", label: "Search", type: "text", placeholder: "Path, store, error, IP...", icon: <SearchIcon /> },
    {
      id: "method",
      label: "Method",
      type: "select",
      defaultOperator: "is_any_of",
      options: [...new Set(requests.map((r) => r.method))].sort().map((v) => ({ value: v, label: v })),
      searchable: false,
      icon: <TagIcon />
    },
    {
      id: "productName",
      label: "Storefront",
      type: "select",
      defaultOperator: "is_any_of",
      options: [...new Set(requests.map((r) => r.productName).filter((v): v is string => !!v))]
        .sort()
        .map((v) => ({ value: v, label: v })),
      searchable: false,
      icon: <StoreIcon />
    },
    {
      id: "ip",
      label: "Caller IP",
      type: "select",
      defaultOperator: "is_any_of",
      options: [...new Set(requests.map((r) => r.ip).filter((v): v is string => !!v))].sort().map((v) => ({ value: v, label: v })),
      searchable: true,
      icon: <GlobeIcon />
    }
  ];

  return (
    <AdminDataTable
      data={requests}
      columns={columns}
      columnLabels={columnLabels}
      getRowId={(r) => r.id}
      filterFields={filterFields}
      readField={readField}
      tabs={tabs}
      tabCounts
      initialSorting={[{ id: "at", desc: true }]}
      emptyText="No requests match these filters."
    />
  );
}
