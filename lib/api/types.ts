/**
 * What the dashboard's pages show. The admin API's own response bodies are in wire.ts;
 * http.ts maps them to these types, joining names (store, storefront) the API returns
 * only as ids. The sample data in fixtures.ts produces these types directly.
 */

export const StatusCode = { Pending: 0, Done: 1, Failed: 2, Removing: 3 } as const;
export type StatusCode = (typeof StatusCode)[keyof typeof StatusCode];

export type Health = {
  ok: boolean;
  checks: { database: "up" | "down"; queue: "up" | "down" };
  checkedAt: string;
};

/** A product is one storefront (one WordPress shop selling stores). */
export type Product = { id: string; name: string; tenantCount: number };

export type StatusCounts = { pending: number; done: number; failed: number; removing: number };

export type Overview = {
  health: Health;
  products: Product[];
  tenants: StatusCounts & { total: number; suspended: number };
  versions: StatusCounts;
  backups: StatusCounts & { total: number };
  jobs: { queued: number; running: number; failed: number };
};

/** One row of the stores list. */
export type Tenant = {
  id: string;
  externalId: string;
  name: string;
  productId: string;
  productName: string;
  versionId: string;
  versionName: string;
  mainDomain: string | null;
  domainCount: number;
  statusCode: StatusCode;
  isSuspended: boolean;
  latestBackupAt: string | null;
  dateCreated: string;
};

export type TenantDomain = { domainName: string; isMain: boolean; isBase: boolean };

/** One store's page. Option and constant names only, never their values. */
export type TenantDetail = {
  id: string;
  externalId: string;
  name: string;
  productId: string;
  productName: string;
  versionId: string;
  versionName: string;
  snapshotName: string | null;
  statusCode: StatusCode;
  isSuspended: boolean;
  dateSuspended: string | null;
  dateCreated: string | null;
  dateChanged: string | null;
  mainDomain: string | null;
  domains: TenantDomain[];
  wpOptionNames: string[];
  phpConstantNames: string[];
  backups: Backup[];
  /** Recent jobs (including finished ones) and failures, newest first. */
  jobs: Job[];
};

export type Backup = {
  id: string;
  productId: string;
  productName: string;
  tenantId: string;
  externalId: string;
  /** Null when the store is deleted (the API has no name for it then). */
  tenantName: string | null;
  reason: "manual" | "suspend" | "scheduled";
  sizeBytes: number | null;
  statusCode: StatusCode;
  dateCreated: string;
  tenantDeletedAt: string | null;
  /** When the backup is purged; null while its store exists. */
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

/** queued, running and failed are the Jobs page's tabs; the rest appear on a store's page. */
export type JobState = "queued" | "running" | "failed" | "retried" | "done" | "cancelled";

export type Job = {
  /** pg-boss job id, or the job_failures id for failed and retried ones. */
  id: string;
  state: JobState;
  /** A JobType; kept as string so a new job type from the API still shows. */
  type: string;
  tenantId: string | null;
  versionId: string | null;
  /** Store name when the job works on a store the dashboard can name. */
  targetName: string | null;
  productName: string | null;
  attempts: number;
  createdAt: string | null;
  startedAt: string | null;
  failedAt: string | null;
  error: string | null;
  retriedAt: string | null;
};

export type JobsList = {
  items: Job[];
  counts: { queued: number; running: number; failed: number };
  /** True when there were more jobs than the dashboard loads. */
  truncated: boolean;
};

export type TenantFilter = { productId?: string };
export type BackupFilter = { productId?: string };
export type JobFilter = { productId?: string };

export type Listing<T> = { items: T[]; total: number };

/** A storefront with its version count and production version, for the Versions page. */
export type ProductDetail = Product & {
  versionCount: number;
  productionVersionId: string | null;
};

export type Version = {
  id: string;
  name: string;
  isProduction: boolean;
  statusCode: StatusCode;
  /** Where the version's shared site runs, e.g. v1-…versions.waas.example */
  domain: string;
  dateCreated: string;
  dateChanged: string;
};

/**
 * A template (a WPCS base snapshot). A base template is what a new version starts from;
 * a group template (isTenantSnapshot) is copied into versions as a starting point for stores.
 */
export type Template = {
  id: string;
  name: string;
  comment: string;
  isTenantSnapshot: boolean;
  groupName: string | null;
  isDefault: boolean;
  /** Offered when creating a product's first version. */
  showAsBaseSnapshot: boolean;
};

export type CreateVersionInput = {
  name: string;
  wordPressVersion: string;
  phpVersion: string;
  /** The base template to start from; omitted when uploading a custom archive. */
  snapshotId?: string;
  /** Group templates to copy into the version. */
  snapshotIdsToCopy?: string[];
  useCustomUpload?: boolean;
  asZip?: boolean;
};

export type CreateTemplateInput = {
  name: string;
  comment: string;
  isTenantSnapshot: boolean;
  groupName?: string;
  showInConsole: boolean;
};

/** Where to PUT the archive, when the operation needs one. */
export type Created = { id: string; uploadUrl: string | null };

/** A record a store's owner adds at their DNS host for its sending domain. */
export type DnsRecord = {
  type: string;
  /** Relative to the domain, as most DNS hosts want it. */
  name: string;
  /** The full hostname. */
  host: string;
  value: string;
  priority: number | null;
};

/** A store's own sending domain: it sends email from no-reply@ this domain once toSend has verified it. */
export type MailDomain = {
  domainName: string;
  /** pending: waiting for the DNS records; verified: the store sends from it; removing: moving back. */
  status: "pending" | "verified" | "removing";
  dateCreated: string;
  dateVerified: string | null;
  /** Null when the API could not reach toSend. */
  records: DnsRecord[] | null;
};
