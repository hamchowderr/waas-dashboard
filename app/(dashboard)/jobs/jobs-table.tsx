"use client";

import * as React from "react";
import Link from "next/link";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { ListChecksIcon, RotateCcwIcon, StoreIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { dismissFailures, retryFailures } from "../actions";

import { SortableHeader } from "@/components/admin/sortable-header";
import type { TableFacet } from "@/components/admin/table-filters";
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
import type { Job } from "@/lib/api/types";
import { formatAgo, formatDateTime, jobTypeLabel, jobTypeLabels } from "@/lib/format";
import { useCanChange } from "@/components/auth/can-change";

const columnLabels: Record<string, string> = {
  type: "Job",
  targetName: "Store or version",
  productName: "Storefront",
  attempts: "Attempts",
  when: "When",
  error: "Error",
  state: "State"
};

/** The latest thing that happened to a job, in words. */
function whenText(job: Job): string {
  if (job.failedAt) return `failed ${formatAgo(job.failedAt)}`;
  if (job.state === "running" && job.startedAt) return `started ${formatAgo(job.startedAt)}`;
  return `queued ${formatAgo(job.createdAt)}`;
}

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
        <span className="text-muted-foreground">A version</span>
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
        {whenText(row.original)}
      </span>
    )
  },
  {
    accessorKey: "error",
    header: "Error",
    cell: ({ row }) => (
      // Two lines here; a click on the row opens the whole error.
      <span className="text-muted-foreground line-clamp-2 block max-w-80 whitespace-normal break-words">
        {row.original.error ?? "—"}
      </span>
    )
  },
  {
    accessorKey: "state",
    header: "State",
    cell: ({ row }) => <JobStateBadge state={row.original.state} />
  }
];

/** Retries failed jobs and reports the outcome; true when every one was accepted. */
async function retry(ids: string[]): Promise<boolean> {
  return report(await retryFailures(ids), (n) => (n === 1 ? "Job queued again" : `${n} jobs queued again`));
}

/** Dismisses failed jobs and reports the outcome; true when every one was accepted. */
async function dismiss(ids: string[]): Promise<boolean> {
  return report(await dismissFailures(ids), (n) => (n === 1 ? "Failed job dismissed" : `${n} failed jobs dismissed`));
}

function report(result: Awaited<ReturnType<typeof retryFailures>>, success: (n: number) => string): boolean {
  if (!result.ok) {
    toast.error(result.error);
    return false;
  }
  const { done, errors } = result.data;
  if (done > 0) toast.success(success(done));
  for (const error of [...new Set(errors)]) toast.error(error);
  return errors.length === 0;
}

export function JobsTable({ jobs, initialTab }: { jobs: Job[]; initialTab: string }) {
  const canChange = useCanChange();
  const [viewing, setViewing] = React.useState<Job | null>(null);
  const [pending, startTransition] = React.useTransition();

  const facets: TableFacet[] = [
    {
      id: "type",
      label: "Job type",
      options: Object.entries(jobTypeLabels).map(([value, label]) => ({ value, label })),
      icon: <ListChecksIcon />
    },
    {
      id: "productName",
      label: "Storefront",
      options: [...new Set(jobs.map((j) => j.productName).filter((v): v is string => !!v))]
        .sort()
        .map((v) => ({ value: v, label: v })),
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
        searchPlaceholder="Job, store, error..."
      facets={facets}
        readField={readField}
        tabs={tabs}
        tabCounts
        initialTab={initialTab}
        initialSorting={[{ id: "when", desc: true }]}
        emptyText="No jobs here. Finished jobs are not listed."
        onRowClick={setViewing}
        selectable={(job) => canChange && job.state === "failed"}
        bulkActions={(selected, clear) => (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await dismiss(selected.map((job) => job.id));
                  clear();
                })
              }>
              <XIcon /> Dismiss {selected.length}
            </Button>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await retry(selected.map((job) => job.id));
                  clear();
                })
              }>
              <RotateCcwIcon /> Retry {selected.length}
            </Button>
          </>
        )}
      />

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{jobTypeLabel(viewing.type)}</DialogTitle>
                <DialogDescription>
                  {viewing.targetName ?? (viewing.versionId ? "A version" : "No store")}
                  {viewing.productName && ` · ${viewing.productName}`}
                </DialogDescription>
              </DialogHeader>
              {viewing.error && (
                <div className="bg-destructive/5 border-destructive/20 rounded-xl border p-4">
                  <div className="text-muted-foreground mb-1 text-sm">Error</div>
                  <p className="max-h-64 overflow-y-auto text-sm break-words whitespace-pre-wrap">{viewing.error}</p>
                </div>
              )}
              {viewing.state === "failed" && (
                <p className="text-muted-foreground text-sm">
                  Retry puts the {viewing.versionId && !viewing.tenantId ? "version" : "store"} back to Pending and
                  runs the same job again. Dismiss takes it off this list without running anything, for a job with
                  nothing left to retry.
                </p>
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
                {canChange && viewing.state === "failed" && (
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        if (await dismiss([viewing.id])) setViewing(null);
                      })
                    }>
                    <XIcon /> Dismiss
                  </Button>
                )}
                {canChange && viewing.state === "failed" ? (
                  <Button
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        if (await retry([viewing.id])) setViewing(null);
                      })
                    }>
                    <RotateCcwIcon /> Retry
                  </Button>
                ) : (
                  <Button onClick={() => setViewing(null)}>Close</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
