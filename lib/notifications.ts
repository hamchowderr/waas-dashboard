import type { Notification } from "@/lib/api/types";

/** Where a notification leads: its store, version list, application or backups. */
export function notificationHref(n: Pick<Notification, "type" | "tenantId" | "versionId" | "applicationId">): string | null {
  if (n.applicationId) return `/applications/${n.applicationId}`;
  if (n.type === "restore_test.failed") return "/backups";
  if (n.type === "tenant.deleted") return null;
  if (n.tenantId) return `/stores/${n.tenantId}`;
  if (n.versionId) return "/versions";
  return null;
}
