import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

import { StatusCode, type JobType, type WebhookEventType } from "@/lib/api/types";

export const statusMeta: Record<
  StatusCode,
  { label: string; badge: "success" | "warning" | "destructive" | "info" }
> = {
  [StatusCode.Pending]: { label: "In progress", badge: "warning" },
  [StatusCode.Done]: { label: "Ready", badge: "success" },
  [StatusCode.Failed]: { label: "Failed", badge: "destructive" },
  [StatusCode.Removing]: { label: "Removing", badge: "warning" }
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
  "tenant.download": "Make a copy to download",
  "tenant.restore": "Restore store",
  "tenant.rollback": "Restore from backup",
  "tenant.go-live": "Go live"
};

export const webhookEventLabels: Record<WebhookEventType, string> = {
  "tenant.ready": "Store ready",
  "tenant.updated": "Store updated",
  "tenant.version_changed": "Store moved to a version",
  "tenant.domains_changed": "Store domains changed",
  "tenant.suspended": "Store suspended",
  "tenant.resumed": "Store resumed",
  "tenant.live": "Store went live",
  "tenant.deleted": "Store deleted",
  "tenant.restored": "Store restored",
  "tenant.rolled_back": "Store restored from backup",
  "tenant.backup_completed": "Backup finished",
  "tenant.backup_failed": "Backup failed",
  "tenant.failed": "Store task failed",
  "version.ready": "Version ready",
  "version.deleted": "Version deleted",
  "version.failed": "Version failed",
  "webhook.test": "Test"
};

/** Label for a webhook event type; an unknown type from a newer API shows as sent. */
export function webhookEventLabel(type: string): string {
  return webhookEventLabels[type as WebhookEventType] ?? type;
}

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

/** A task error as people read it: without the part of the API that raised it, or provider codes such as "(403 AccessDenied)". */
export function plainError(error: string | null): string | null {
  // Provider codes in brackets ("(403 AccessDenied)") stay in the task's details, not here.
  const text = error
    ?.replace(/^Provisioner:\s*/, "")
    .replace(/\s*\(\d{3} [A-Za-z]+\)/g, "")
    .trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : null;
}

/** Care time: "30 min", "2 h", "1 h 20 min". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(Math.max(0, minutes) / 60);
  const m = Math.max(0, minutes) % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
