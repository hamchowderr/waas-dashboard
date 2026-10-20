"use client";

import Link from "next/link";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { CircleAlertIcon, GlobeIcon, KeyRoundIcon, ShoppingBagIcon, StoreIcon, TagIcon } from "lucide-react";

import { SortableHeader } from "@/components/admin/sortable-header";
import type { TableFacet } from "@/components/admin/table-filters";
import { AdminDataTable, type TableTab } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import type { ApiRequest } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { madeWith } from "@/lib/requests";

const columnLabels: Record<string, string> = {
  at: "Time",
  path: "Request",
  status: "Status",
  tenantName: "Store",
  madeWith: "Made with",
  productName: "Storefront",
  durationMs: "Took",
  ip: "Caller"
};

const tabs: TableTab<ApiRequest>[] = [
  { value: "errors", label: "Errors", match: (r) => r.status >= 400 },
  { value: "v1", label: "API calls", match: (r) => r.source === "v1" },
  { value: "admin", label: "Dashboard changes", match: (r) => r.source !== "v1" }
];

function readField(row: ApiRequest, path: string): unknown {
  if (path === "search")
    return `${row.path} ${row.query ?? ""} ${row.tenantName ?? ""} ${row.externalId ?? ""} ${row.error ?? ""} ${row.ip ?? ""} ${row.apiKeyId ?? ""} ${row.apiKeyLabel ?? ""}`;
  if (path === "madeWith") return madeWith(row);
  if (path === "store") return row.tenantName ?? "";
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
        <div className="max-w-xs min-w-0 2xl:max-w-md">
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
    id: "madeWith",
    accessorFn: (r) => madeWith(r),
    header: "Made with",
    cell: ({ row }) => (
      <span className="whitespace-nowrap" title={row.original.apiKeyId ?? undefined}>
        {madeWith(row.original)}
      </span>
    )
  },
  {
    accessorKey: "productName",
    header: "Storefront",
    cell: ({ row }) => row.original.productName ?? <span className="text-muted-foreground">{row.original.source === "v1" ? "Unknown key" : "Admin"}</span>
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

/** `showStorefront`: the platform admin's view of every storefront; an agency sees only its own. */
export function RequestsTable({ requests, showStorefront = true }: { requests: ApiRequest[]; showStorefront?: boolean }) {
  const values = (pick: (r: ApiRequest) => string | null | undefined) =>
    [...new Set(requests.map(pick).filter((v): v is string => !!v))].sort().map((v) => ({ value: v, label: v }));
  const facets: TableFacet[] = [
    { id: "store", label: "Store", options: values((r) => r.tenantName), icon: <ShoppingBagIcon /> },
    {
      id: "status",
      label: "Status",
      options: [...new Set(requests.map((r) => r.status))].sort((a, b) => a - b).map((v) => ({ value: String(v), label: String(v) })),
      icon: <CircleAlertIcon />
    },
    { id: "madeWith", label: "Made with", options: values(madeWith), icon: <KeyRoundIcon /> },
    {
      id: "method",
      label: "Method",
      options: [...new Set(requests.map((r) => r.method))].sort().map((v) => ({ value: v, label: v })),
      icon: <TagIcon />
    },
    ...(showStorefront ? [{ id: "productName", label: "Storefront", options: values((r) => r.productName), icon: <StoreIcon /> }] : []),
    {
      id: "ip",
      label: "Caller IP",
      options: [...new Set(requests.map((r) => r.ip).filter((v): v is string => !!v))].sort().map((v) => ({ value: v, label: v })),
      icon: <GlobeIcon />
    }
  ];

  return (
    <AdminDataTable
      data={requests}
      columns={showStorefront ? columns : columns.filter((c) => !("accessorKey" in c && c.accessorKey === "productName"))}
      columnLabels={columnLabels}
      getRowId={(r) => r.id}
      searchPlaceholder="Path, store, key, error, IP..."
      facets={facets}
      readField={readField}
      tabs={tabs}
      tabCounts
      initialSorting={[{ id: "at", desc: true }]}
      hideBelow={{ madeWith: "2xl", ip: "2xl" }}
      emptyText="No requests match these filters."
    />
  );
}
