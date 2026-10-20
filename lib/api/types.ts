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
  /** A site moved in from another host keeps its own plugins and themes. */
  keepsOwnCode: boolean;
  /** Only for a store made to move a site in. It waits for the site while startedAt is null. */
  moveIn: MoveIn | null;
};

export type MoveIn = {
  /** When the import code stops working if the move hasn't started. */
  expiresAt: string;
  startedAt: string | null;
  /** What the export plugin told about the old site. */
  source: { home?: string; wordPressVersion?: string; phpVersion?: string; uploadedBytes?: number } | null;
};

/** A store waiting for its site: the code to paste into the AnyPress Export plugin, and where to get the plugin. */
export type ImportCode = { tenantId: string; externalId: string; importCode: string; pluginUrl: string };

export type StoreSize = "small" | "medium" | "large";

export type Backup = {
  id: string;
  productId: string;
  productName: string;
  tenantId: string;
  externalId: string;
  /** Null when the store is deleted (the API has no name for it then). */
  tenantName: string | null;
  reason: "manual" | "suspend" | "scheduled" | "before-restore";
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
  | "tenant.restore"
  | "tenant.rollback";

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

/**
 * One call to the provisioning API: a product API call (v1), an admin change, or a change a
 * storefront's signed-in people made from this dashboard (account).
 */
export type ApiRequest = {
  id: string;
  at: string;
  source: "v1" | "admin" | "account";
  method: string;
  path: string;
  /** The query string without its "?". */
  query: string | null;
  status: number;
  durationMs: number;
  productId: string | null;
  productName: string | null;
  apiKeyId: string | null;
  /** The key's label, when it has one. */
  apiKeyLabel: string | null;
  /** The signed-in person who made the call from this dashboard, or through an AI app they connected. */
  userId: string | null;
  tenantId: string | null;
  /** Null once the store is deleted, or when the call named no store (or another storefront's). */
  tenantName: string | null;
  externalId: string | null;
  ip: string | null;
  userAgent: string | null;
  /** The API's error message for a 4xx or 5xx. */
  error: string | null;
};

export type RequestOutcome = "ok" | "client-error" | "server-error" | "error";
export type RequestFilter = {
  productId?: string;
  tenantId?: string;
  outcome?: RequestOutcome;
  /** Only calls at or after this ISO time. */
  from?: string;
};

export type RequestLog = Listing<ApiRequest> & {
  last24Hours: { total: number; clientErrors: number; serverErrors: number };
  /** Days the API keeps each request. */
  retentionDays: number;
};

/** A storefront with its version count and production version, for the Versions page. */
export type ProductDetail = Product & {
  versionCount: number;
  productionVersionId: string | null;
  /** The reseller it belongs to; null for a storefront of its own. */
  resellerId: string | null;
  resellerName: string | null;
};

/** A partner that sells stores from one or more storefronts and pays a wholesale price for each live store. */
/** A client set up in one step (Add client): their own storefront, one site, and an invitation. */
export type Client = {
  productId: string;
  name: string;
  email: string;
  size: StoreSize;
  /** setting_up until the site is built; invited until they accept; active once they have. */
  status: "setting_up" | "invited" | "active" | "needs_attention";
  tenantId: string | null;
  siteDomain: string | null;
  /** Why the storefront or site could not be built, when status is needs_attention. */
  problem: string | null;
  invitationEmailed: boolean;
  dateCreated: string;
};

export type Reseller = ResellerSettings & {
  id: string;
  products: Product[];
  /** Stores across its storefronts. */
  tenantCount: number;
  /** Stores counting toward its bill now. */
  liveTenantCount: number;
  dateCreated: string;
};

export type ResellerSettings = {
  name: string;
  /** Storefronts it may have; null is no limit. */
  maxProducts: number | null;
  /** Stores across all its storefronts; null is no limit. */
  maxTenants: number | null;
  /** Discount off list price on its bill. */
  wholesalePercent: number;
  billingEmail: string | null;
  /** Monthly list price of one store of each size, in US cents, before the discount. */
  listPriceCents: Record<StoreSize, number>;
};

/** Days a store was live, per size: a store live all of a 30-day month is 30. */
export type StoreDays = Record<StoreSize, number>;

export type ResellerUsage = {
  from: string;
  to: string;
  storeDays: StoreDays;
  products: { productId: string; name: string | null; storeDays: StoreDays }[];
};

/** A reseller's wholesale bill for one calendar month (UTC). Amounts are US cents. */
export type ResellerBill = {
  month: string;
  /** False while the month is not over yet. */
  complete: boolean;
  wholesalePercent: number;
  billingEmail: string | null;
  lines: {
    productId: string;
    name: string | null;
    size: StoreSize;
    storeDays: number;
    /** Store-months: store-days over the days in the month. */
    stores: number;
    listPriceCents: number;
    wholesalePriceCents: number;
    amountCents: number;
  }[];
  totalCents: number;
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
 * A template (a base snapshot in the API). A base template is what a new version starts from;
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

/** A link that adds a domain's records at its DNS host (Domain Connect); url is null when the host can't. */
export type DomainConnectLink = {
  dnsProvider: string | null;
  supported: boolean;
  url: string | null;
  /** Why there is no link though the DNS host could make one (an older DKIM key on the domain, say), written for the store's owner. */
  conflict?: string;
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

/** What a webhook is sent for (the API's WebhookEventType). */
export type WebhookEventType =
  | "tenant.ready"
  | "tenant.updated"
  | "tenant.version_changed"
  | "tenant.domains_changed"
  | "tenant.suspended"
  | "tenant.resumed"
  | "tenant.deleted"
  | "tenant.restored"
  | "tenant.rolled_back"
  | "tenant.backup_completed"
  | "tenant.backup_failed"
  | "tenant.failed"
  | "version.ready"
  | "version.deleted"
  | "version.failed"
  | "webhook.test";

/** An address a storefront gets webhooks at, as every list of them returns it. */
export type WebhookEndpointInfo = {
  id: string;
  url: string;
  description: string | null;
  /** WebhookEventTypes, kept as strings so a new type from the API still shows. Empty is every event. */
  eventTypes: string[];
  enabled: boolean;
  dateCreated: string;
  dateChanged: string;
};

/** One row of the Webhooks page's endpoints, with how its deliveries have gone. */
export type WebhookEndpoint = WebhookEndpointInfo & {
  productId: string;
  productName: string;
  /** The storefront API key that registered it; null when it was added here. */
  apiKeyId: string | null;
  last24Hours: { sent: number; failed: number };
  /** Deliveries still being sent or retried. */
  pending: number;
  lastAttemptAt: string | null;
};

/** An endpoint with its signing secret: returned only when it is created or its secret replaced. */
export type WebhookSecret = WebhookEndpointInfo & { secret: string };

export type WebhookEndpointInput = { url: string; description: string | null; eventTypes: WebhookEventType[] };
export type WebhookEndpointChange = Partial<WebhookEndpointInput> & { enabled?: boolean };

export type WebhookDeliveryStatus = "pending" | "delivered" | "failed";

/** One event sent (or being sent) to one endpoint. */
export type WebhookDelivery = {
  id: string;
  eventId: string;
  /** A WebhookEventType; kept as string so a new type from the API still shows. */
  eventType: string;
  endpointId: string;
  /** The endpoint's address. */
  url: string;
  productId: string;
  productName: string;
  tenantId: string | null;
  /** Null once the store is deleted, or when the event is not about a store. */
  tenantName: string | null;
  versionId: string | null;
  status: WebhookDeliveryStatus;
  attempts: number;
  /** The endpoint's HTTP status on the last try; null when it did not answer. */
  responseStatus: number | null;
  /** The start of the endpoint's answer. */
  responseBody: string | null;
  error: string | null;
  durationMs: number | null;
  dateCreated: string;
  lastAttemptAt: string | null;
};

export type WebhookFilter = {
  productId?: string;
  endpointId?: string;
  status?: WebhookDeliveryStatus;
  tenantId?: string;
};
/** An API key's state: expiring is a rotated key that still works until revokedAt. */
export type ApiKeyState = "active" | "expiring" | "revoked";

/** A storefront's API key, never its secret. */
export type ApiKey = {
  id: string;
  label: string | null;
  state: ApiKeyState;
  dateCreated: string;
  lastUsedAt: string | null;
  /** When it stops (stopped) working; null while active. */
  revokedAt: string | null;
};

/** A key just created: its secret is here and nowhere else, shown once. */
export type NewApiKey = ApiKey & { secret: string };

export type NewAgencyInput = {
  name: string;
  maxTenants: number | null;
  /** A storefront whose production version and newest template the new one starts with. */
  startFrom?: string | null;
};

/** A storefront team role: owners and admins make changes, members only look. */
export type TeamRole = "owner" | "admin" | "member";

export type TeamMember = { id: string; userId: string; name: string; email: string; role: TeamRole; dateCreated: string };

export type TeamInvitation = {
  id: string;
  email: string;
  role: TeamRole;
  expiresAt: string;
  dateCreated: string;
  /** Where they accept; send it yourself when the email didn't go. */
  acceptUrl: string | null;
};

/** A storefront's team: null organization until someone is first invited. */
export type Team = {
  organization: { id: string; name: string } | null;
  members: TeamMember[];
  invitations: TeamInvitation[];
};

/** An invitation just made, and whether the API emailed it. */
export type NewInvitation = TeamInvitation & { emailed: boolean };
export type NewAgency = {
  productId: string;
  name: string;
  key: NewApiKey;
  /** The ready-made storefront being built, when one was asked for. */
  storefront?: ReadyStorefront;
  /** Why it couldn't be built; the agency and its key exist anyway. */
  storefrontError?: string;
};

/** A ready-made storefront: a WordPress site with WaaS Host that the platform built and connected for a product. */
export type ReadyStorefront = { id: string; name: string; domain: string; statusCode: StatusCode; statusName: string };

/** The owner signs in to WordPress with this email; the site answers on <subdomain>.<platform domain>. */
export type NewStorefrontInput = { name: string; email: string; subdomain?: string };

/** An application to sell websites, sent from the marketing site's form and waiting for the platform admin. */
export type ApplicationStatus = "pending" | "approved" | "declined";

export type SellerApplication = {
  id: string;
  name: string;
  email: string;
  business: string;
  website: string | null;
  /** Who they sell websites to, in their words. */
  clients: string;
  /** Websites they expect to sell in their first year: 1-2, 3-9, 10-24 or 25+. */
  expectedSites: string;
  /** They have no WordPress site to sell from and want a ready-made storefront. */
  wantsStorefront: boolean;
  storefrontSubdomain: string | null;
  status: ApplicationStatus;
  /** The storefront made when it was approved. */
  productId: string | null;
  dateDecided: string | null;
  dateCreated: string;
};

/** What approving an application made. */
export type ApprovedApplication = {
  productId: string;
  /** The applicant's owner invitation; emailed false means send acceptUrl yourself. */
  invitation: { acceptUrl: string; emailed: boolean };
  storefront?: ReadyStorefront;
  /** Why the ready-made storefront couldn't be built; the approval stands anyway. */
  storefrontError?: string;
};
