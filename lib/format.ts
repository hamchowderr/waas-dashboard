import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

import { StatusCode, type JobType } from "@/lib/api/types";

export const statusMeta: Record<
  StatusCode,
  { label: string; badge: "success" | "warning" | "destructive" | "info" }
> = {
  [StatusCode.Pending]: { label: "Pending", badge: "warning" },
  [StatusCode.Done]: { label: "Ready", badge: "success" },
  [StatusCode.Failed]: { label: "Failed", badge: "destructive" },
  [StatusCode.Removing]: { label: "Removing", badge: "info" }
};

export const jobTypeLabels: Record<JobType, string> = {
  "version.create": "Build version",
  "version.delete": "Delete version",
  "tenant.create": "Create store",
  "tenant.update": "Update store",
  "tenant.move": "Move store to version",
  "tenant.domains": "Apply domains",
  "tenant.delete": "Delete store",
  "tenant.suspend": "Suspend store",
  "tenant.resume": "Resume store",
  "tenant.backup": "Back up store",
  "tenant.restore": "Restore store",
  "tenant.rollback": "Restore from backup"
};

const backupReasonLabels: Record<string, string> = {
  manual: "Manual",
  suspend: "Suspend",
  scheduled: "Scheduled",
  "before-restore": "Before restore"
};

/** Label for why a backup was taken; an unknown reason from a newer API shows as sent. */
export function backupReasonLabel(reason: string): string {
  return backupReasonLabels[reason] ?? reason;
}

/** Label for a job type; an unknown type from a newer API shows as sent. */
export function jobTypeLabel(type: string): string {
  return jobTypeLabels[type as JobType] ?? type;
}

export function formatDate(value: string | null | undefined): string {
  return value ? format(parseISO(value), "MMM d, yyyy") : "—";
}

export function formatDateTime(value: string | null | undefined): string {
  return value ? format(parseISO(value), "MMM d, yyyy HH:mm") : "—";
}

export function formatAgo(value: string | null | undefined): string {
  return value ? `${formatDistanceToNowStrict(parseISO(value))} ago` : "—";
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
}
