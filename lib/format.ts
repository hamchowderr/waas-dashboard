import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

import { StatusCode, type JobType, type WebhookEventType } from "@/lib/api/types";

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

export const webhookEventLabels: Record<WebhookEventType, string> = {
  "tenant.ready": "Store ready",
  "tenant.updated": "Store updated",
  "tenant.version_changed": "Store moved to a version",
  "tenant.domains_changed": "Store domains changed",
  "tenant.suspended": "Store suspended",
  "tenant.resumed": "Store resumed",
  "tenant.deleted": "Store deleted",
  "tenant.restored": "Store restored",
  "tenant.rolled_back": "Store restored from backup",
  "tenant.backup_completed": "Backup finished",
  "tenant.backup_failed": "Backup failed",
  "tenant.failed": "Store job failed",
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

const settingLabels: Record<string, string> = {
  blogname: "Site title",
  blogdescription: "Tagline",
  admin_email: "Owner email",
  timezone_string: "Time zone",
  date_format: "Date format",
  time_format: "Time format",
  WPLANG: "Language",
  woocommerce_currency: "Currency",
  fluent_cart_currency: "Currency",
  WP_MEMORY_LIMIT: "Memory limit",
  WP_MAX_MEMORY_LIMIT: "Admin memory limit",
  DISALLOW_FILE_EDIT: "File editor turned off",
  DISALLOW_FILE_MODS: "Plugin installs turned off",
  WP_AUTO_UPDATE_CORE: "WordPress auto-updates",
  WP_DEBUG: "Debug mode",
  WP_POST_REVISIONS: "Post revisions kept",
  WAAS_TENANT_ROLES: "Plan roles",
  WAAS_PUBLIC_KEY: "One-click sign-in key",
  WAAS_TENANT_NO_ADMINISTRATOR_PLUGIN_CAPS: "Plugins managed by the plan",
  WAAS_API_BASE_URL: "API address",
  WAAS_API_KEY: "API key",
  WAAS_API_SECRET: "API secret",
  WAAS_HOST_KEY_ENCRYPTION_KEY: "Sign-in key encryption",
  waas_root_domain: "Website domain",
};

/** Names stores were given under the old platform's prefix, shown like their waas_ spelling. */
const legacyNames: Record<string, string> = {
  wpcs_host_settings_root_domain: "waas_root_domain",
};

/** Plain label for a WordPress option or PHP constant a store was made with; unknown names are spelled out. */
export function settingLabel(name: string): string {
  name = legacyNames[name] ?? name.replace(/^WPCS_/, "WAAS_");
  const known = settingLabels[name];
  if (known) return known;
  const words = name
    .replace(/^(WP|WAAS)_/, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
