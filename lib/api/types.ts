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
  /** A site moved in, held until it goes live. False when the API's list doesn't say. */
  onHold: boolean;
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
  /**
   * A site moved in, held until it goes live: its scheduled tasks don't run, it emails only its owner
   * and it isn't indexed by search engines.
   */
  onHold: boolean;
  dateHeld: string | null;
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
  /** Once the move failed, why, in words the site's owner can act on. */
  reason: string | null;
  /** What to check after the move: another PHP version, a newer WordPress, a failed health check. */
  warnings: string[];
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
  | "tenant.rollback"
  | "tenant.go-live";

/** queued, running and failed are the Jobs page's tabs; the rest appear on a store's page. */
export type JobState = "queued" | "running" | "failed" | "retried" | "dismissed" | "done" | "cancelled";

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

/** acrossReseller: a reseller team's stores on every storefront of its account (the API's ?across=reseller). */
export type TenantFilter = { productId?: string; acrossReseller?: boolean };
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
  /** The most stores it may have; null is no limit. */
  maxTenants: number | null;
  versionCount: number;
  productionVersionId: string | null;
  /** The reseller it belongs to; null for a storefront of its own. */
  resellerId: string | null;
  resellerName: string | null;
};

/** A partner that sells stores from one or more storefronts and pays a wholesale price for each live store. */
export type Reseller = ResellerSettings & {
  id: string;
  autoInvoice: boolean;
  stripeCustomerId: string | null;
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
  /** Its own name, and a link on it, on the "website unavailable" page of its suspended stores; null uses the platform's. */
  brandName: string | null;
  brandUrl: string | null;
  /** Monthly list price of one store of each size, in US cents, before the discount. */
  listPriceCents: Record<StoreSize, number>;
  /** Send its bill as a Stripe invoice on the 1st. Unchanged when left out. */
  autoInvoice?: boolean;
  /** Its Stripe customer (cus_…); made from billingEmail on the first invoice when null. Unchanged when left out. */
  stripeCustomerId?: string | null;
};

/** One month's bill sent as a Stripe invoice. */
export type ResellerInvoice = {
  id: string;
  month: string;
  totalCents: number;
  /** open: Stripe is charging the card on file, or emailed it to pay. nothing_due: no charge that month. */
  status: "sending" | "nothing_due" | "open" | "paid" | "void" | "uncollectible" | "failed";
  /** Stripe's page to view and pay it. */
  hostedInvoiceUrl: string | null;
  /** true: charged to the card on file; false: emailed to pay. */
  chargeAutomatically: boolean | null;
  error: string | null;
  dateUpdated: string;
};

export type ResellerInvoices = {
  /** false while the API has no Stripe key: bills are sent by hand. */
  enabled: boolean;
  invoices: ResellerInvoice[];
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

/** A wordpress.org plugin as the directory's search returns it. */
export type DirectoryPlugin = {
  slug: string;
  name: string;
  version: string;
  icon: string | null;
  author: string;
  shortDescription: string;
  /** 0 to 100. */
  rating: number;
  numRatings: number;
  activeInstalls: number;
  lastUpdated: string | null;
  testedUpTo: string | null;
  requiresPhp: string | null;
  /** Why stores can't have it (it clashes with the hosting), or null. */
  blocked: string | null;
};

export type PluginSearch = { page: number; pages: number; results: number; plugins: DirectoryPlugin[] };

/**
 * A plugin a storefront's stores get on top of its template (add, pinned to one version), or a template
 * plugin it switches off, for some site types or all (empty). Built into each new version.
 */
export type PluginChoice = {
  slug: string;
  name: string;
  icon: string | null;
  action: "add" | "off";
  version: string | null;
  /** Where an added plugin comes from: wordpress.org, or a zip uploaded here (a premium plugin). */
  source: "wporg" | "upload";
  /** Names of the licence constants set for it; their values are never shown. */
  licenceConstants: string[];
  siteTypes: string[];
  /** The reseller's, for all its storefronts; changed on the reseller, not here. */
  shared: boolean;
  /** The production version has it as it is now; otherwise it reaches stores with the next version. */
  inProduction: boolean;
  /** Newest version on wordpress.org (added plugins). */
  latestVersion: string | null;
};

export type PluginChoiceInput = {
  action: "add" | "off";
  version?: string;
  siteTypes: string[];
  /** A checked upload of this plugin, instead of wordpress.org. */
  uploadId?: string;
  /** PHP constants (licence keys) stores get with it. Left out keeps them; null removes them. */
  licence?: Record<string, string> | null;
};

/** A premium plugin's zip, uploaded and then checked by the API before it can be added. */
export type PluginUpload = {
  id: string;
  status: "pending" | "ready" | "rejected";
  /** Rejected: why. */
  reason: string | null;
  slug: string | null;
  name: string | null;
  version: string | null;
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
  | "tenant.live"
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

export type NewSellerInput = {
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

/**
 * Whose team: a storefront's (its product id), or a reseller's, whose people reach every storefront
 * the reseller has. Only the platform admin manages a reseller's team.
 */
export type TeamOf = string | { resellerId: string };

/** A storefront's or reseller's team: null organization until someone is first invited. */
export type Team = {
  organization: { id: string; name: string } | null;
  members: TeamMember[];
  invitations: TeamInvitation[];
};

/** An invitation just made, and whether the API emailed it. */
export type NewInvitation = TeamInvitation & { emailed: boolean };
export type NewSeller = {
  productId: string;
  name: string;
  key: NewApiKey;
  /** The ready-made storefront being built, when one was asked for. */
  storefront?: ReadyStorefront;
  /** Why it couldn't be built; the seller and its key exist anyway. */
  storefrontError?: string;
};

/** A ready-made storefront: a WordPress site with WaaS Host that the platform built and connected for a product. */
export type ReadyStorefront = { id: string; name: string; domain: string; statusCode: StatusCode; statusName: string };

/** The owner signs in to WordPress with this email; the site answers on <subdomain>.<platform domain>. */
export type NewStorefrontInput = { name: string; email: string; subdomain?: string };

/** Add storefront: one more storefront in a reseller's account, a copy of startFrom's production version and template. */
export type AddStorefrontInput = { name: string; startFrom: string };

export type AddedStorefront = { id: string; name: string };

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
  /** The reseller account made when it was approved as a reseller. */
  resellerId: string | null;
  dateDecided: string | null;
  dateCreated: string;
};

/**
 * How to approve an application: as a seller (a storefront with maxTenants stores), or as a reseller
 * (an account with maxTenants stores across up to maxProducts storefronts, the storefront inside it).
 */
export type ApproveApplicationInput = {
  maxTenants: number | null;
  storefront: boolean;
  reseller?: boolean;
  maxProducts?: number | null;
};

/** What approving an application made. */
export type ApprovedApplication = {
  productId: string;
  /** The reseller account, for a reseller approval. */
  resellerId?: string;
  /** The applicant's owner invitation; emailed false means send acceptUrl yourself. */
  invitation: { acceptUrl: string; emailed: boolean };
  storefront?: ReadyStorefront;
  /** Why the ready-made storefront couldn't be built; the approval stands anyway. */
  storefrontError?: string;
};

/**
 * A storefront's or reseller's own look in the dashboard (the API's docs/branding.md). Null fields
 * are not set; the dashboard shows the platform's own name, mark and color for them.
 */
export type Branding = {
  name: string | null;
  /** #rrggbb */
  color: string | null;
  supportEmail: string | null;
  logoUrl: string | null;
  iconUrl: string | null;
};

/** The fields set here, and `shown`: what the dashboard shows once a reseller's branding fills a storefront's gaps. */
export type BrandingView = Branding & { shown: Branding };

/** The fields a form sets; null clears one. */
export type BrandingFields = { name: string | null; color: string | null; supportEmail: string | null };

export type BrandImage = "logo" | "icon";

/** A storefront's own dashboard address (the API's docs/branding.md). */
export type DashboardDomain = {
  domain: string;
  /** active: the host serves it with a certificate. */
  status: "pending" | "active";
  /** DNS records still to add; name is the full hostname. */
  records: { type: "CNAME" | "A" | "TXT"; name: string; value: string }[];
  error: string | null;
  checkedAt: string | null;
};

/** enabled: this server offers own addresses at all. */
export type DashboardDomainView = { enabled: boolean; dashboardDomain: DashboardDomain | null };
