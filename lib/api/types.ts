/**
 * Response shapes of the provisioning API's admin endpoints (/admin/*).
 *
 * The admin API is being built in hamchowderr/waas-provisioning-api (beads waas-api-plu.1).
 * These types are the dashboard's proposal for its shapes; when the API ships, its
 * openapi/admin/ spec is the source of truth and these types follow it.
 *
 * Field names follow the API's existing conventions: camelCase, ISO 8601 timestamps,
 * and `statusCode` 0 Pending, 1 Done, 2 Failed, 3 Removing.
 */

export const StatusCode = { Pending: 0, Done: 1, Failed: 2, Removing: 3 } as const;
export type StatusCode = (typeof StatusCode)[keyof typeof StatusCode];

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

/** GET /health (waas-api-9g2): 200 when healthy, 503 otherwise, same body. */
export type Health = {
  ok: boolean;
  checks: {
    database: "up" | "down";
    queue: "up" | "down";
  };
  checkedAt: string;
};

/** A product is one storefront (one WordPress shop selling stores). */
export type Product = {
  id: string;
  name: string;
  tenantCount: number;
};

/** GET /admin/overview */
export type Overview = {
  health: Health;
  products: Product[];
  tenants: {
    total: number;
    byStatus: { pending: number; done: number; failed: number; removing: number };
    suspended: number;
  };
  versions: { total: number; failed: number };
  backups: { total: number; failed: number; sizeBytes: number };
  jobs: { queued: number; active: number; failedUnresolved: number };
  generatedAt: string;
};

export type TenantDomain = {
  domainName: string;
  isMain: boolean;
  isBase: boolean;
};

/** One row of GET /admin/tenants */
export type Tenant = {
  id: string;
  externalId: string;
  name: string;
  productId: string;
  productName: string;
  versionId: string;
  versionName: string;
  statusCode: StatusCode;
  isSuspended: boolean;
  dateSuspended: string | null;
  mainDomain: string;
  domains: TenantDomain[];
  latestBackupAt: string | null;
  dateCreated: string;
  dateChanged: string;
};

/** GET /admin/tenants/:id. Option and constant names only, never their values. */
export type TenantDetail = Tenant & {
  snapshotName: string;
  wpOptionKeys: string[];
  phpConstantNames: string[];
  backups: Backup[];
  jobs: Job[];
};

/** One row of GET /admin/backups. Deleted tenants' backups are included. */
export type Backup = {
  id: string;
  productId: string;
  productName: string;
  tenantId: string;
  externalId: string;
  /** Null when the tenant has been deleted and its name was not stamped on the backup. */
  tenantName: string | null;
  reason: "manual" | "suspend";
  sizeBytes: number | null;
  statusCode: StatusCode;
  dateCreated: string;
  tenantDeletedAt: string | null;
  /** tenantDeletedAt + BACKUP_RETENTION_DAYS; null while the tenant exists. */
  expiresAt: string | null;
};

export type JobType =
  | "version.create"
  | "version.delete"
  | "tenant.create"
  | "tenant.update"
  | "tenant.move"
  | "tenant.domains"
  | "tenant.delete"
  | "tenant.suspend"
  | "tenant.resume"
  | "tenant.backup"
  | "tenant.restore";

export type JobState = "queued" | "active" | "failed";

/**
 * One row of GET /admin/jobs. Queued and active jobs come from pg-boss; failed ones from
 * the job_failures table (the worker completes a job after its last failed attempt).
 */
export type Job = {
  id: string;
  state: JobState;
  type: JobType;
  productId: string | null;
  productName: string | null;
  tenantId: string | null;
  versionId: string | null;
  /** Tenant or version name, for display. */
  targetName: string | null;
  attempts: number;
  createdAt: string;
  startedAt: string | null;
  failedAt: string | null;
  error: string | null;
  /** Set on failed jobs: the job_failures row id the retry endpoint takes. */
  failureId: string | null;
  retriedAt: string | null;
};

export type JobsPage = Page<Job> & {
  counts: { queued: number; active: number; failed: number };
};

export type TenantFilter = {
  productId?: string;
  page?: number;
  pageSize?: number;
};

export type BackupFilter = {
  productId?: string;
  tenantId?: string;
  page?: number;
  pageSize?: number;
};

export type JobFilter = {
  productId?: string;
  tenantId?: string;
  state?: JobState;
  page?: number;
  pageSize?: number;
};
