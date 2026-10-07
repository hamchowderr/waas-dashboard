"use client";

import * as React from "react";
import Link from "next/link";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { ListChecksIcon, SearchIcon, StoreIcon } from "lucide-react";

import { SortableHeader } from "@/components/table-filter-helpers";
import { AdminDataTable, type TableTab } from "@/components/admin/data-table";
import { JobStateBadge } from "@/components/admin/job-state-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import type { FilterField } from "@/components/ui/filters/filters-types";
import type { Job } from "@/lib/api/types";
import { formatAgo, formatDateTime, jobTypeLabel, jobTypeLabels } from "@/lib/format";

const columnLabels: Record<string, string> = {
  type: "Job",
  targetName: "Store or version",
  productName: "Storefront",
  attempts: "Attempts",
  when: "When",
  error: "Error",
  state: "State"
};

const tabs: TableTab<Job>[] = [
  { value: "queued", label: "Queued", match: (j) => j.state === "queued" },
  { value: "running", label: "Running", match: (j) => j.state === "running" },
  { value: "failed", label: "Failed", match: (j) => j.state === "failed" }
];

function readField(row: Job, path: string): unknown {
  if (path === "search") return `${jobTypeLabel(row.type)} ${row.type} ${row.targetName ?? ""} ${row.error ?? ""} ${row.id}`;
  return row[path as keyof Job];
}

const columns: ColumnDef<Job>[] = [
  {
    accessorKey: "type",
    header: "Job",
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="font-medium">{jobTypeLabel(row.original.type)}</div>
        <div className="text-muted-foreground font-mono text-xs">{row.original.type}</div>
      </div>
    )
  },
  {
    accessorKey: "targetName",
    header: "Store or version",
    cell: ({ row }) =>
      row.original.tenantId ? (
        <Link
          href={`/stores/${row.original.tenantId}`}
          onClick={(event) => event.stopPropagation()}
          className="hover:text-primary hover:underline">
          {row.original.targetName ?? row.original.tenantId}
        </Link>
      ) : row.original.versionId ? (
        <span className="text-muted-foreground font-mono text-xs">version {row.original.versionId.slice(0, 8)}</span>
      ) : (
        "—"
      )
  },
  { accessorKey: "productName", header: "Storefront", cell: ({ row }) => row.original.productName ?? "—" },
  {
    id: "when",
    accessorFn: (job) => job.failedAt ?? job.createdAt,
    header: ({ column }) => <SortableHeader column={column}>When</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap">
        {row.original.failedAt ? `failed ${formatAgo(row.original.failedAt)}` : `queued ${formatAgo(row.original.createdAt)}`}
      </span>
    )
  },
  {
    accessorKey: "error",
    header: "Error",
    cell: ({ row }) => (
      <span className="text-muted-foreground block max-w-80 truncate">{row.original.error ?? "—"}</span>
    )
  },
  {
    accessorKey: "state",
    header: "State",
    cell: ({ row }) => <JobStateBadge state={row.original.state} />
  }
];

export function JobsTable({ jobs, initialTab }: { jobs: Job[]; initialTab: string }) {
  const [viewing, setViewing] = React.useState<Job | null>(null);

  const filterFields: FilterField[] = [
    { id: "search", label: "Search", type: "text", placeholder: "Job, store, error...", icon: <SearchIcon /> },
    {
      id: "type",
      label: "Job type",
      type: "select",
      defaultOperator: "is_any_of",
      options: Object.entries(jobTypeLabels).map(([value, label]) => ({ value, label })),
      searchable: false,
      icon: <ListChecksIcon />
    },
    {
      id: "productName",
      label: "Storefront",
      type: "select",
      defaultOperator: "is_any_of",
      options: [...new Set(jobs.map((j) => j.productName).filter((v): v is string => !!v))]
        .sort()
        .map((v) => ({ value: v, label: v })),
      searchable: false,
      icon: <StoreIcon />
    }
  ];

  return (
    <>
      <AdminDataTable
        data={jobs}
        columns={columns}
        columnLabels={columnLabels}
        getRowId={(j) => j.id}
        filterFields={filterFields}
        readField={readField}
        tabs={tabs}
        tabCounts
        initialTab={initialTab}
        initialSorting={[{ id: "when", desc: true }]}
        emptyText="No jobs here. Finished jobs are not listed."
        onRowClick={setViewing}
      />

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{jobTypeLabel(viewing.type)}</DialogTitle>
                <DialogDescription className="font-mono">{viewing.id}</DialogDescription>
              </DialogHeader>
              {viewing.error && (
                <div className="bg-destructive/5 border-destructive/20 rounded-xl border p-4">
                  <div className="text-muted-foreground mb-1 text-sm">Error</div>
                  <p className="text-sm break-words">{viewing.error}</p>
                </div>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <dt className="text-muted-foreground">State</dt>
                <dd className="justify-self-end">
                  <JobStateBadge state={viewing.state} />
                </dd>
                <dt className="text-muted-foreground">Store or version</dt>
                <dd className="justify-self-end text-end">{viewing.targetName ?? "—"}</dd>
                <dt className="text-muted-foreground">Storefront</dt>
                <dd className="justify-self-end text-end">{viewing.productName ?? "—"}</dd>
                <dt className="text-muted-foreground">Attempts</dt>
                <dd className="justify-self-end tabular-nums">{viewing.attempts}</dd>
                {viewing.createdAt && (
                  <>
                    <dt className="text-muted-foreground">Queued</dt>
                    <dd className="justify-self-end tabular-nums">{formatDateTime(viewing.createdAt)}</dd>
                  </>
                )}
                {viewing.startedAt && (
                  <>
                    <dt className="text-muted-foreground">Started</dt>
                    <dd className="justify-self-end tabular-nums">{formatDateTime(viewing.startedAt)}</dd>
                  </>
                )}
                {viewing.failedAt && (
                  <>
                    <dt className="text-muted-foreground">Failed</dt>
                    <dd className="justify-self-end tabular-nums">{formatDateTime(viewing.failedAt)}</dd>
                  </>
                )}
              </dl>
              <DialogFooter>
                {viewing.tenantId && (
                  <Button variant="outline" asChild>
                    <Link href={`/stores/${viewing.tenantId}`}>Open store</Link>
                  </Button>
                )}
                <Button onClick={() => setViewing(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
