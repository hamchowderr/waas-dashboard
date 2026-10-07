/**
 * The admin API's response bodies, exactly as openapi/admin/admin-api.yaml (v0.1.0) in
 * hamchowderr/waas-provisioning-api defines them. http.ts maps these to the view types
 * in types.ts. When the spec changes, change this file first.
 */

export type WireStatusCounts = { pending: number; done: number; failed: number; removing: number };
export type WireJobCounts = { queued: number; running: number; failed: number };

export type WireOverview = {
  health: { ok: boolean; database: "ok" | "down"; queue: "ok" | "down" };
  tenants: WireStatusCounts & { suspended: number };
  versions: WireStatusCounts;
  backups: WireStatusCounts;
  jobs: WireJobCounts;
  products: { id: string; name: string; tenantCount: number }[];
};

export type WirePage<T> = { items: T[]; total: number; page: number; pageSize: number };

export type WireTenantRow = {
  id: string;
  externalId: string;
  name: string;
  productId: string;
  productName: string;
  versionId: string;
  versionName: string;
  mainDomain: string | null;
  domainCount: number;
  statusCode: number;
  statusName: string;
  isSuspended: boolean;
  latestBackupAt: string | null;
  dateCreated: string;
};

export type WireBackup = {
  id: string;
  tenantId: string;
  externalId: string;
  productId: string;
  reason: "manual" | "suspend";
  sizeBytes: number | null;
  statusCode: number;
  statusName: string;
  dateCreated: string;
  tenantDeletedAt: string | null;
  expiresAt: string | null;
};

export type WireJobTarget = {
  type: string;
  tenantId: string | null;
  versionId: string | null;
  backupId: string | null;
  baseSnapshotId: string | null;
};

/** A pg-boss job. */
export type WireJob = WireJobTarget & {
  id: string;
  state: "created" | "retry" | "active" | "completed" | "cancelled" | "failed";
  attempts: number;
  createdOn: string;
  startedOn?: string | null;
  startAfter?: string | null;
  completedOn?: string | null;
};

/** A job that failed its last retry (job_failures row). */
export type WireJobFailure = WireJobTarget & {
  id: string;
  jobId: string;
  errorMessage: string;
  attempts: number;
  failedAt: string;
  status: "failed" | "retried";
  retriedAt: string | null;
  retryJobId: string | null;
};

export type WireJobsPage = WirePage<WireJob | WireJobFailure> & {
  state: "queued" | "running" | "failed";
  counts: WireJobCounts;
};

export type WireTenantDetail = {
  id: string;
  externalId: string;
  name: string;
  productId: string;
  productName: string;
  versionId: string;
  versionName: string;
  snapshotName?: string;
  snapshotGroupName?: string | null;
  statusCode: number;
  statusName: string;
  isSuspended: boolean;
  dateSuspended?: string | null;
  dateCreated?: string;
  dateChanged?: string;
  wpOptionNames: string[];
  phpConstantNames: string[];
  domains: { id: string; domainName: string; isMainDomain: boolean; isBaseDomain: boolean }[];
  backups: WireBackup[];
  recentJobs: WireJob[];
  failures: WireJobFailure[];
};
