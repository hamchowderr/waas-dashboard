import { describe, expect, it } from "vitest";

import { notificationHref } from "./notifications";

const n = { type: "tenant.ready", tenantId: null, versionId: null, applicationId: null };

describe("notificationHref", () => {
  it("opens the store, version list, application or backups the notification is about", () => {
    expect(notificationHref({ ...n, tenantId: "t1" })).toBe("/stores/t1");
    expect(notificationHref({ ...n, type: "version.ready", versionId: "v1" })).toBe("/versions");
    expect(notificationHref({ ...n, type: "application.received", applicationId: "a1" })).toBe("/applications/a1");
    expect(notificationHref({ ...n, type: "restore_test.failed", tenantId: "t1" })).toBe("/backups");
  });

  it("has no link for a deleted store", () => {
    expect(notificationHref({ ...n, type: "tenant.deleted", tenantId: "t1" })).toBeNull();
  });
});
