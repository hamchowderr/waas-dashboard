"use client";

import * as React from "react";
import Link from "next/link";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { LinkIcon, RotateCcwIcon, SearchIcon, StoreIcon, TagIcon } from "lucide-react";
import { toast } from "sonner";

import { retryWebhookDelivery } from "../actions";

import { SortableHeader } from "@/components/table-filter-helpers";
import { AdminDataTable, type TableTab } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { FilterField } from "@/components/ui/filters/filters-types";
import type { WebhookDelivery } from "@/lib/api/types";
import { formatDateTime, webhookEventLabel, webhookEventLabels } from "@/lib/format";

const columnLabels: Record<string, string> = {
  dateCreated: "Time",
  eventType: "Event",
  tenantName: "Store",
  url: "Endpoint",
  status: "Status",
  attempts: "Attempts",
  responseStatus: "Answer",
  details: "Details",
  retry: "Send again"
};

const tabs: TableTab<WebhookDelivery>[] = [
  { value: "failed", label: "Failed", match: (d) => d.status === "failed" },
  { value: "pending", label: "Pending", match: (d) => d.status === "pending" },
  { value: "delivered", label: "Delivered", match: (d) => d.status === "delivered" }
];

const statusBadge = {
  delivered: { label: "Delivered", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  failed: { label: "Failed", variant: "destructive" }
} as const;

function readField(row: WebhookDelivery, path: string): unknown {
  if (path === "search")
    return `${webhookEventLabel(row.eventType)} ${row.eventType} ${row.url} ${row.tenantName ?? ""} ${row.error ?? ""} ${row.responseBody ?? ""} ${row.id}`;
  return row[path as keyof WebhookDelivery];
}

function RetryButton({ delivery }: { delivery: WebhookDelivery }) {
  const [pending, startTransition] = React.useTransition();
  if (delivery.status === "pending") return <span className="text-muted-foreground">—</span>;
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await retryWebhookDelivery(delivery.id);
          if (result.ok) toast.success("Sending it again");
          else toast.error(result.error);
        })
      }>
      {pending ? <Spinner /> : <RotateCcwIcon />} Retry
    </Button>
  );
}

const columns: ColumnDef<WebhookDelivery>[] = [
  {
    accessorKey: "dateCreated",
    header: ({ column }) => <SortableHeader column={column}>Time</SortableHeader>,
    cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.dateCreated)}</span>
  },
  {
    accessorKey: "eventType",
    header: "Event",
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="font-medium">{webhookEventLabel(row.original.eventType)}</div>
        <div className="text-muted-foreground font-mono text-xs">{row.original.eventType}</div>
      </div>
    )
  },
  {
    accessorKey: "tenantName",
    header: "Store",
    cell: ({ row }) => {
      const d = row.original;
      if (d.tenantId)
        return (
          <Link href={`/stores/${d.tenantId}`} className="hover:text-primary font-medium hover:underline">
            {d.tenantName ?? "Deleted store"}
          </Link>
        );
      return <span className="text-muted-foreground">{d.versionId ? "A version" : "None"}</span>;
    }
  },
  {
    accessorKey: "url",
    header: "Endpoint",
    cell: ({ row }) => (
      <div className="max-w-64 min-w-0">
        <div className="truncate font-mono text-xs" title={row.original.url}>
          {row.original.url}
        </div>
        <div className="text-muted-foreground truncate text-xs">{row.original.productName}</div>
      </div>
    )
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const badge = statusBadge[row.original.status];
      return <Badge variant={badge.variant}>{badge.label}</Badge>;
    }
  },
  {
    accessorKey: "attempts",
    header: ({ column }) => <SortableHeader column={column}>Attempts</SortableHeader>,
    cell: ({ row }) => <span className="tabular-nums">{row.original.attempts}</span>
  },
  {
    accessorKey: "responseStatus",
    header: "Answer",
    cell: ({ row }) => {
      const status = row.original.responseStatus;
      if (status === null) return <span className="text-muted-foreground">None</span>;
      return (
        <Badge variant={status >= 500 ? "destructive" : status >= 300 ? "warning" : "success"} className="tabular-nums">
          {status}
        </Badge>
      );
    }
  },
  {
    id: "details",
    accessorFn: (d) => d.error ?? d.responseBody,
    header: "Details",
    enableSorting: false,
    cell: ({ row }) => {
      const d = row.original;
      if (d.error)
        return (
          <span className="text-destructive line-clamp-2 block max-w-72 text-xs whitespace-normal" title={d.error}>
            {d.error}
          </span>
        );
      if (d.responseBody)
        return (
          <span
            className="text-muted-foreground line-clamp-2 block max-w-72 font-mono text-xs break-all whitespace-normal"
            title={d.responseBody}>
            {d.responseBody}
          </span>
        );
      return <span className="text-muted-foreground">—</span>;
    }
  },
  {
    id: "retry",
    header: () => <span className="sr-only">Send again</span>,
    enableSorting: false,
    cell: ({ row }) => <RetryButton delivery={row.original} />
  }
];

export function DeliveriesTable({ deliveries }: { deliveries: WebhookDelivery[] }) {
  const filterFields: FilterField[] = [
    { id: "search", label: "Search", type: "text", placeholder: "Event, endpoint, store, error...", icon: <SearchIcon /> },
    {
      id: "eventType",
      label: "Event",
      type: "select",
      defaultOperator: "is_any_of",
      options: Object.entries(webhookEventLabels).map(([value, label]) => ({ value, label })),
      searchable: false,
      icon: <TagIcon />
    },
    {
      id: "productName",
      label: "Storefront",
      type: "select",
      defaultOperator: "is_any_of",
      options: [...new Set(deliveries.map((d) => d.productName))].sort().map((v) => ({ value: v, label: v })),
      searchable: false,
      icon: <StoreIcon />
    },
    {
      id: "url",
      label: "Endpoint",
      type: "select",
      defaultOperator: "is_any_of",
      options: [...new Set(deliveries.map((d) => d.url))].sort().map((v) => ({ value: v, label: v })),
      searchable: true,
      icon: <LinkIcon />
    }
  ];

  return (
    <AdminDataTable
      data={deliveries}
      columns={columns}
      columnLabels={columnLabels}
      getRowId={(d) => d.id}
      filterFields={filterFields}
      readField={readField}
      tabs={tabs}
      tabCounts
      initialSorting={[{ id: "dateCreated", desc: true }]}
      emptyText="No deliveries match these filters."
    />
  );
}
