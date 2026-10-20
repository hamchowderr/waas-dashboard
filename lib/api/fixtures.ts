import "server-only";

import { randomBytes } from "node:crypto";

import type { AdminApi } from "./client";
import {
  StatusCode,
  type ImportCode,
  type MoveIn,
  type StoreSize,
  type ApiKey,
  type ApplicationStatus,
  type ApprovedApplication,
  type SellerApplication,
  type NewAgency,
  type NewAgencyInput,
  type NewStorefrontInput,
  type ReadyStorefront,
  type NewApiKey,
  type NewInvitation,
  type Team,
  type TeamRole,
  type Backup,
  type BackupFilter,
  type Health,
  type Job,
  type JobFilter,
  type JobsList,
  type Listing,
  type DomainConnectLink,
  type MailDomain,
  type Overview,
  type Product,
  type ApiRequest,
  type RequestFilter,
  type RequestLog,
  type Tenant,
  type TenantDetail,
  type TenantDomain,
  type TenantFilter,
  type Created,
  type CreateTemplateInput,
  type CreateVersionInput,
  type ProductDetail,
  type Template,
  type Version,
  type WebhookDelivery,
  type WebhookEndpoint,
  type WebhookEndpointChange,
  type WebhookEndpointInfo,
  type WebhookEndpointInput,
  type WebhookFilter,
  type WebhookSecret
} from "./types";
import { AdminApiError } from "./http";

/** Sample stores' own sending domains, by tenant id. */
const mailDomains = new Map<string, MailDomain>();
import { FIXTURE_UPLOAD_URL } from "./upload";

// Sample data for building and reviewing the UI before the admin endpoints exist.
// The same data on every request, with timestamps relative to the current hour.

// "Now" rounded to the hour, so relative times read naturally and stay stable within the hour.
const NOW = Math.floor(Date.now() / 3_600_000) * 3_600_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const RETENTION_DAYS = 90;

const iso = (time: number) => new Date(time).toISOString();

function uuid(n: number, kind: number): string {
  const hex = (n * 7919 + kind * 104729).toString(16).padStart(12, "0").slice(-12);
  return `${kind.toString(16).padStart(8, "0")}-0000-4000-8000-${hex}`;
}

const products: Omit<Product, "tenantCount">[] = [
  { id: uuid(1, 1), name: "Test storefront" },
  { id: uuid(2, 1), name: "Staging storefront" }
];

type FixtureVersion = Version & { productId: string };

const versions: FixtureVersion[] = [
  { id: uuid(1, 2), name: "v1.4", productId: products[0].id, isProduction: true },
  { id: uuid(2, 2), name: "v1.5-beta", productId: products[0].id, isProduction: false },
  { id: uuid(3, 2), name: "v1.4", productId: products[1].id, isProduction: true },
  { id: uuid(4, 2), name: "v1.3", productId: products[0].id, isProduction: false }
].map((v, i) => ({
  ...v,
  statusCode: StatusCode.Done,
  domain: `${v.name.replace(/\./g, "-")}-${v.id.slice(-8)}.versions.waas.example`,
  dateCreated: iso(NOW - (90 - i * 20) * DAY),
  dateChanged: iso(NOW - (60 - i * 15) * DAY)
}));

type FixtureTemplate = Template & { productId: string };

const templates: FixtureTemplate[] = [
  { name: "Starter template", comment: "WooCommerce, theme and the WaaS Client plugin", isTenantSnapshot: false, groupName: null, isDefault: true, showAsBaseSnapshot: true },
  { name: "Catalog store", comment: "Catalog-only store without checkout", isTenantSnapshot: true, groupName: "catalog", isDefault: false, showAsBaseSnapshot: false },
  { name: "Checkout store", comment: "Store with checkout, shipping and tax set up", isTenantSnapshot: true, groupName: "store", isDefault: false, showAsBaseSnapshot: false }
].flatMap((t, i) =>
  products.map((p, j) => ({ ...t, id: uuid(i * 10 + j + 1, 7), productId: p.id }))
);


type FixtureKey = ApiKey & { productId: string };

/** Ready-made storefronts by product; none in the sample data. */
const storefronts = new Map<string, ReadyStorefront>();

/** Applications to sell, as the marketing site's form sends them. */
const applications: SellerApplication[] = [
  {
    id: "a1b2c3d4-0000-4000-8000-000000000001",
    name: "Maya Ortiz",
    email: "maya@brightsideweb.example",
    business: "Brightside Web Studio",
    website: "https://brightsideweb.example/",
    clients: "Restaurants, salons and small shops in Tucson. Most want online booking and a menu they can change themselves.",
    expectedSites: "10-24",
    wantsStorefront: false,
    storefrontSubdomain: null,
    status: "pending",
    productId: null,
    dateDecided: null,
    dateCreated: new Date(Date.now() - 3 * 3600_000).toISOString()
  },
  {
    id: "a1b2c3d4-0000-4000-8000-000000000002",
    name: "Darnell Brooks",
    email: "darnell@eastsidechamber.example",
    business: "Eastside Chamber of Commerce",
    website: null,
    clients: "Our member businesses. Many of them still have no website at all.",
    expectedSites: "25+",
    wantsStorefront: true,
    storefrontSubdomain: "eastside-chamber",
    status: "pending",
    productId: null,
    dateDecided: null,
    dateCreated: new Date(Date.now() - 26 * 3600_000).toISOString()
  },
  {
    id: "a1b2c3d4-0000-4000-8000-000000000003",
    name: "Quick Sites",
    email: "sales@quick-sites.example",
    business: "Quick Sites 4 U",
    website: "https://quick-sites.example/",
    clients: "anyone",
    expectedSites: "25+",
    wantsStorefront: false,
    storefrontSubdomain: null,
    status: "declined",
    productId: null,
    dateDecided: new Date(Date.now() - 50 * 3600_000).toISOString(),
    dateCreated: new Date(Date.now() - 72 * 3600_000).toISOString()
  }
];

const apiKeys: FixtureKey[] = [
  {
    id: uuid(1, 9),
    productId: products[0].id,
    label: "Storefront",
    state: "active",
    dateCreated: iso(NOW - 40 * DAY),
    lastUsedAt: iso(NOW - HOUR / 4),
    revokedAt: null
  },
  {
    id: uuid(2, 9),
    productId: products[0].id,
    label: "Old storefront key",
    state: "revoked",
    dateCreated: iso(NOW - 80 * DAY),
    lastUsedAt: iso(NOW - 41 * DAY),
    revokedAt: iso(NOW - 12 * DAY)
  },
  {
    id: uuid(3, 9),
    productId: products[1].id,
    label: null,
    state: "active",
    dateCreated: iso(NOW - 20 * DAY),
    lastUsedAt: null,
    revokedAt: null
  }
];

/** A made-up secret: sample data only. */
const sampleSecret = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[b % 64]).join("").slice(0, 43);

class FixtureError extends AdminApiError {
  constructor(status: number, message: string) {
    super(status, "(sample data)", message);
  }
}

const VERSION_NAME = /^[A-Za-z0-9.-]{1,30}$/;
const TEMPLATE_NAME = /^[A-Za-z0-9 -]{5,50}$/;

// Obviously fictional names and reserved .example domains: sample data must never look like a real business.
const storeNames = Array.from({ length: 20 }, (_, i) => `Example Store ${i + 1}`);

type TenantSeed = { status: StatusCode; suspended?: boolean; custom?: string; extra?: string[] };

const seeds: TenantSeed[] = [
  { status: StatusCode.Done, custom: "shop.store1.example", extra: ["store1.example"] },
  { status: StatusCode.Done },
  { status: StatusCode.Done, custom: "store3.example" },
  { status: StatusCode.Pending },
  { status: StatusCode.Done, suspended: true },
  { status: StatusCode.Failed },
  { status: StatusCode.Done, custom: "store7.example" },
  { status: StatusCode.Done },
  { status: StatusCode.Done, suspended: true, custom: "store9.example" },
  { status: StatusCode.Done },
  { status: StatusCode.Removing },
  { status: StatusCode.Done, custom: "store12.example", extra: ["www.store12.example"] },
  { status: StatusCode.Done },
  { status: StatusCode.Pending },
  { status: StatusCode.Done },
  { status: StatusCode.Pending, custom: "store16.example" },
  { status: StatusCode.Done },
  { status: StatusCode.Done },
  { status: StatusCode.Done },
  { status: StatusCode.Done, custom: "store20.example" }
];

type FixtureTenant = Tenant & {
  domains: TenantDomain[];
  dateSuspended: string | null;
  dateChanged: string;
  moveIn?: MoveIn;
};

const tenants: FixtureTenant[] = seeds.map((seed, i) => {
  const version = versions[i % 5 === 4 ? 2 : i % 4 === 1 ? 1 : 0];
  const product = products.find((p) => p.id === version.productId)!;
  const id = uuid(i + 1, 3);
  const base = `t-${id.slice(-8)}.stores.waas.example`;
  const domains = [
    { domainName: base, isMain: !seed.custom, isBase: true },
    ...(seed.custom ? [{ domainName: seed.custom, isMain: true, isBase: false }] : []),
    ...(seed.extra ?? []).map((domainName) => ({ domainName, isMain: false, isBase: false }))
  ];
  const created = NOW - (60 - i * 2.5) * DAY;
  return {
    id,
    externalId: `sub_${(48210 + i * 37).toString()}`,
    name: storeNames[i],
    productId: product.id,
    productName: product.name,
    versionId: version.id,
    versionName: version.name,
    statusCode: seed.status,
    isSuspended: !!seed.suspended,
    dateSuspended: seed.suspended ? iso(NOW - (3 + i) * DAY) : null,
    mainDomain: domains.find((d) => d.isMain)!.domainName,
    domainCount: domains.length,
    domains,
    latestBackupAt: null,
    dateCreated: iso(created),
    dateChanged: iso(created + (i % 3) * DAY + 5 * HOUR)
  };
});

const backups: Backup[] = [];
tenants.forEach((tenant, i) => {
  const count = tenant.isSuspended ? 2 : i % 3 === 0 ? 1 : 0;
  for (let b = 0; b < count; b++) {
    const reason = tenant.isSuspended && b === 0 ? "suspend" : "manual";
    const at = tenant.isSuspended && b === 0 ? Date.parse(tenant.dateSuspended!) : NOW - (10 + i + b * 7) * DAY;
    backups.push({
      id: uuid(backups.length + 1, 4),
      productId: tenant.productId,
      productName: tenant.productName,
      tenantId: tenant.id,
      externalId: tenant.externalId,
      tenantName: tenant.name,
      reason,
      sizeBytes: (180 + ((i * 37 + b * 11) % 240)) * 1_048_576,
      statusCode: i === 6 && b === 0 ? StatusCode.Failed : StatusCode.Done,
      dateCreated: iso(at),
      tenantDeletedAt: null,
      expiresAt: null
    });
  }
});
// Two backups of stores that have since been deleted, kept for restore until they expire.
for (const [n, name, deletedDaysAgo] of [
  [1, "Example Store 21", 12],
  [2, "Example Store 22", 81]
] as const) {
  const deletedAt = NOW - deletedDaysAgo * DAY;
  backups.push({
    id: uuid(100 + n, 4),
    productId: products[0].id,
    productName: products[0].name,
    tenantId: uuid(100 + n, 3),
    externalId: `sub_${47000 + n}`,
    tenantName: name,
    reason: "suspend",
    sizeBytes: (210 + n * 40) * 1_048_576,
    statusCode: StatusCode.Done,
    dateCreated: iso(deletedAt - 14 * DAY),
    tenantDeletedAt: iso(deletedAt),
    expiresAt: iso(deletedAt + RETENTION_DAYS * DAY)
  });
}
for (const tenant of tenants) {
  const latest = backups
    .filter((b) => b.tenantId === tenant.id && b.statusCode === StatusCode.Done)
    .map((b) => b.dateCreated)
    .sort()
    .at(-1);
  tenant.latestBackupAt = latest ?? null;
}

function job(
  n: number,
  state: Job["state"],
  type: string,
  tenant: Tenant,
  minutesAgo: number,
  extra: Partial<Job> = {}
): Job {
  const failed = state === "failed";
  return {
    id: uuid(n, failed ? 6 : 5),
    state,
    type,
    tenantId: tenant.id,
    versionId: null,
    targetName: tenant.name,
    productName: tenant.productName,
    attempts: failed ? 4 : state === "running" ? 1 : 0,
    createdAt: failed ? null : iso(NOW - minutesAgo * 60_000),
    startedAt: state === "running" ? iso(NOW - (minutesAgo - 1) * 60_000) : null,
    failedAt: failed ? iso(NOW - minutesAgo * 60_000) : null,
    error: null,
    retriedAt: null,
    ...extra
  };
}

const jobs: Job[] = [
  job(1, "running", "tenant.create", tenants[3], 2),
  job(2, "queued", "tenant.create", tenants[13], 1),
  job(3, "queued", "tenant.domains", tenants[3], 1),
  job(4, "running", "tenant.delete", tenants[10], 4),
  job(5, "failed", "tenant.create", tenants[5], 170, {
    error: "Provisioner: store host did not answer within 600 s (create container)"
  }),
  job(6, "failed", "tenant.domains", tenants[15], 40, {
    error: "Provisioner: certificate request for store16.example rejected: DNS does not point at the store host"
  }),
  job(7, "failed", "tenant.backup", tenants[6], 2880, {
    error: "Provisioner: backup upload to object storage failed (403 AccessDenied)"
  })
];

/** Finished jobs, shown only on a store's page (the API's recentJobs). */
const finishedJobs: Job[] = tenants.map((tenant, i) =>
  job(50 + i, "done", "tenant.create", tenant, (60 - i * 2.5) * 24 * 60)
);

// Sample request log: the storefront plugin's calls every few minutes, a few failures, and two
// admin changes.
const requestLog: ApiRequest[] = Array.from({ length: 80 }, (_, i): ApiRequest => {
  const tenant = tenants[i % tenants.length];
  const product = products.find((p) => p.id === tenant.productId)!;
  const kind = i % 10;
  const base = {
    id: String(5000 - i),
    at: iso(NOW + 50 * 60_000 - i * 17 * 60_000),
    source: "v1" as const,
    query: null,
    productId: product.id,
    productName: product.name,
    apiKeyId: uuid(product === products[0] ? 1 : 2, 9),
    apiKeyLabel: "Storefront plugin",
    userId: null,
    tenantId: tenant.id,
    tenantName: tenant.name,
    externalId: null,
    ip: "203.0.113.20",
    userAgent: "WordPress/6.8; https://shop.example.com",
    error: null
  };
  if (kind === 3)
    return { ...base, method: "POST", path: "/v1/tenants", status: 400, durationMs: 12, tenantId: null, tenantName: null, error: "name is required" };
  if (kind === 6)
    return {
      ...base,
      method: "GET",
      path: "/v1/tenants",
      status: 403,
      durationMs: 41,
      productId: null,
      productName: null,
      tenantId: null,
      tenantName: null,
      ip: "198.51.100.7",
      userAgent: "curl/8.7.1",
      error: "Invalid API key or secret"
    };
  if (i === 44)
    return { ...base, method: "POST", path: `/v1/tenants/${tenant.id}/backups`, status: 500, durationMs: 230, error: "Internal server error" };
  if (i === 9 || i === 51)
    return {
      ...base,
      source: "admin",
      method: "PUT",
      path: `/admin/tenants/${tenant.id}/domains/main`,
      status: 200,
      durationMs: 85,
      productId: null,
      productName: null,
      apiKeyId: null,
      apiKeyLabel: null,
      userAgent: "node"
    };
  if (kind % 2 === 0)
    return { ...base, method: "GET", path: "/v1/tenants", query: `externalId=sub_${1000 + i}`, externalId: `sub_${1000 + i}`, status: 200, durationMs: 9 + (i % 7), tenantId: null, tenantName: null };
  return { ...base, method: "GET", path: "/v1/plugins/waas-host/update", query: "channel=stable&version=2.3.0", status: 200, durationMs: 18, tenantId: null, tenantName: null };
});

// Sample webhooks: the test storefront's plugin gets every event, an alerts endpoint gets failures
// and is answering 502 lately, and the staging storefront's endpoint is turned off.

type FixtureWebhook = WebhookEndpointInfo & { productId: string; apiKeyId: string | null; secret: string };

const newSecret = () => `whsec_${randomBytes(24).toString("base64")}`;

const webhooks: FixtureWebhook[] = [
  {
    url: "https://shop.example.com/wp-json/waas/v1/webhook",
    description: "Storefront plugin",
    eventTypes: [],
    enabled: true,
    productId: products[0].id,
    apiKeyId: uuid(1, 9)
  },
  {
    url: "https://alerts.example.net/hooks/waas",
    description: "Failure alerts",
    eventTypes: ["tenant.failed", "tenant.backup_failed", "version.failed"],
    enabled: true,
    productId: products[0].id,
    apiKeyId: null
  },
  {
    url: "https://staging.example.com/wp-json/waas/v1/webhook",
    description: null,
    eventTypes: [],
    enabled: false,
    productId: products[1].id,
    apiKeyId: uuid(2, 9)
  }
].map((w, i) => ({
  ...w,
  id: uuid(i + 1, 10),
  secret: newSecret(),
  dateCreated: iso(NOW - (40 - i * 10) * DAY),
  dateChanged: iso(NOW - (20 - i * 5) * DAY)
}));

type DeliverySeed = {
  endpoint: number;
  type: string;
  tenant?: number;
  minutesAgo: number;
  status: WebhookDelivery["status"];
  attempts?: number;
  responseStatus?: number | null;
  responseBody?: string | null;
  error?: string | null;
};

const deliverySeeds: DeliverySeed[] = [
  { endpoint: 0, type: "tenant.ready", tenant: 3, minutesAgo: 3, status: "pending", attempts: 2, responseStatus: null, error: "The endpoint did not answer within 10 s" },
  { endpoint: 0, type: "tenant.domains_changed", tenant: 0, minutesAgo: 25, status: "delivered" },
  { endpoint: 1, type: "tenant.failed", tenant: 5, minutesAgo: 170, status: "pending", attempts: 6, responseStatus: 502, responseBody: "<html><body><h1>502 Bad Gateway</h1></body></html>" },
  { endpoint: 0, type: "tenant.failed", tenant: 5, minutesAgo: 170, status: "delivered" },
  { endpoint: 0, type: "tenant.suspended", tenant: 8, minutesAgo: 240, status: "delivered" },
  { endpoint: 1, type: "tenant.backup_failed", tenant: 6, minutesAgo: 640, status: "failed", attempts: 11, responseStatus: 502, responseBody: "<html><body><h1>502 Bad Gateway</h1></body></html>" },
  { endpoint: 0, type: "tenant.backup_failed", tenant: 6, minutesAgo: 640, status: "delivered" },
  { endpoint: 0, type: "tenant.backup_completed", tenant: 0, minutesAgo: 600, status: "delivered" },
  { endpoint: 0, type: "tenant.updated", tenant: 2, minutesAgo: 780, status: "failed", attempts: 11, responseStatus: 500, responseBody: "Internal Server Error" },
  { endpoint: 0, type: "tenant.ready", tenant: 13, minutesAgo: 900, status: "delivered" },
  { endpoint: 0, type: "version.ready", minutesAgo: 1300, status: "delivered" },
  { endpoint: 0, type: "webhook.test", minutesAgo: 1500, status: "delivered" },
  { endpoint: 1, type: "webhook.test", minutesAgo: 1510, status: "delivered" },
  { endpoint: 0, type: "tenant.resumed", tenant: 4, minutesAgo: 2000, status: "delivered" },
  { endpoint: 0, type: "tenant.deleted", tenant: 10, minutesAgo: 2600, status: "delivered", attempts: 3 },
  { endpoint: 1, type: "version.failed", minutesAgo: 3100, status: "delivered" },
  { endpoint: 0, type: "version.failed", minutesAgo: 3100, status: "delivered" },
  { endpoint: 2, type: "tenant.ready", tenant: 4, minutesAgo: 7300, status: "delivered" },
  { endpoint: 2, type: "tenant.updated", tenant: 9, minutesAgo: 8800, status: "failed", attempts: 11, responseStatus: null, error: "Could not connect: certificate has expired" },
  { endpoint: 0, type: "tenant.version_changed", tenant: 1, minutesAgo: 9900, status: "delivered" }
];

const webhookDeliveries: WebhookDelivery[] = deliverySeeds.map((seed, i) => {
  const endpoint = webhooks[seed.endpoint];
  const product = products.find((p) => p.id === endpoint.productId)!;
  const tenant = seed.tenant === undefined ? undefined : tenants[seed.tenant];
  const at = NOW + 50 * 60_000 - seed.minutesAgo * 60_000;
  const delivered = seed.status === "delivered";
  const attempts = seed.attempts ?? (delivered ? 1 : 0);
  return {
    id: uuid(i + 1, 11),
    eventId: uuid(i + 1, 12),
    eventType: seed.type,
    endpointId: endpoint.id,
    url: endpoint.url,
    productId: product.id,
    productName: product.name,
    tenantId: tenant?.id ?? null,
    tenantName: tenant?.name ?? null,
    versionId: seed.type.startsWith("version.") ? versions.find((v) => v.productId === product.id)!.id : null,
    status: seed.status,
    attempts,
    responseStatus: seed.responseStatus === undefined ? (delivered ? 200 : null) : seed.responseStatus,
    responseBody: seed.responseBody ?? (delivered ? '{"received":true}' : null),
    error: seed.error ?? null,
    durationMs: delivered ? 80 + ((i * 53) % 400) : seed.responseStatus ? 1200 : null,
    dateCreated: iso(at),
    // A failed delivery's last try is about seven hours after the first; a pending one's is a
    // few minutes ago.
    lastAttemptAt:
      attempts === 0
        ? null
        : iso(seed.status === "failed" ? at + 7 * HOUR : seed.status === "pending" ? Math.max(at + (attempts - 1) * 60_000, NOW + 45 * 60_000) : at + (attempts - 1) * 60_000)
  };
});

function health(): Health {
  return { ok: true, checks: { database: "up", queue: "up" }, checkedAt: new Date().toISOString() };
}

const listing = <T,>(items: T[]): Listing<T> => ({ items, total: items.length });

const byProduct = <T extends { productId: string | null }>(items: T[], productId?: string) =>
  productId ? items.filter((item) => item.productId === productId) : items;

const counts = (items: { statusCode: StatusCode }[]) => ({
  pending: items.filter((i) => i.statusCode === StatusCode.Pending).length,
  done: items.filter((i) => i.statusCode === StatusCode.Done).length,
  failed: items.filter((i) => i.statusCode === StatusCode.Failed).length,
  removing: items.filter((i) => i.statusCode === StatusCode.Removing).length
});

/** A copy of `item` without the given keys (fixture records carry fields the list rows don't). */
function without<T extends object, K extends keyof T>(item: T, ...keys: K[]): Omit<T, K> {
  const copy = { ...item };
  for (const key of keys) delete copy[key];
  return copy;
}

const toRow = (t: FixtureTenant): Tenant => without(t, "domains", "dateSuspended", "dateChanged");

type FixtureTeam = Team & { productId: string };

const teams: FixtureTeam[] = [
  {
    productId: products[0].id,
    organization: { id: uuid(1, 12), name: products[0].name },
    members: [
      { id: uuid(1, 13), userId: uuid(1, 14), name: "Dana Rivers", email: "dana@northwind.example", role: "owner", dateCreated: iso(NOW - 30 * DAY) },
      { id: uuid(2, 13), userId: uuid(2, 14), name: "Sam Ortiz", email: "sam@northwind.example", role: "admin", dateCreated: iso(NOW - 12 * DAY) },
      { id: uuid(3, 13), userId: uuid(3, 14), name: "Lee Park", email: "lee@northwind.example", role: "member", dateCreated: iso(NOW - 2 * DAY) }
    ],
    invitations: [
      {
        id: uuid(1, 15),
        email: "alex@northwind.example",
        role: "member",
        expiresAt: iso(NOW + 5 * DAY),
        dateCreated: iso(NOW - 2 * DAY),
        acceptUrl: `https://app.example.com/invite/${uuid(1, 15)}`
      }
    ]
  }
];

export class FixtureAdminApi implements AdminApi {
  readonly isFixture = true;

  async overview(productId?: string): Promise<Overview> {
    const mine = byProduct(tenants, productId);
    const ids = new Set(mine.map((t) => t.id));
    const myBackups = productId ? backups.filter((b) => ids.has(b.tenantId)) : backups;
    const myJobs = productId ? jobs.filter((j) => j.tenantId && ids.has(j.tenantId)) : jobs;
    return {
      health: health(),
      products: products.map((p) => ({ ...p, tenantCount: tenants.filter((t) => t.productId === p.id).length })),
      tenants: { ...counts(mine), total: mine.length, suspended: mine.filter((t) => t.isSuspended).length },
      versions: { pending: 0, done: versions.length, failed: 0, removing: 0 },
      backups: { ...counts(myBackups), total: myBackups.length },
      jobs: {
        queued: myJobs.filter((j) => j.state === "queued").length,
        running: myJobs.filter((j) => j.state === "running").length,
        failed: myJobs.filter((j) => j.state === "failed").length
      }
    };
  }

  async tenants(filter: TenantFilter = {}): Promise<Listing<Tenant>> {
    return listing(byProduct(tenants, filter.productId).map(toRow));
  }

  async tenant(id: string): Promise<TenantDetail | null> {
    const tenant = tenants.find((t) => t.id === id);
    if (!tenant) return null;
    return {
      ...tenant,
      snapshotName: "Starter template",
      wpOptionNames: ["blogname", "admin_email", "woocommerce_currency"],
      phpConstantNames: ["WPCS_TENANT_ROLES", "WPCS_PUBLIC_KEY", "WPCS_TENANT_NO_ADMINISTRATOR_PLUGIN_CAPS"],
      backups: backups.filter((b) => b.tenantId === id),
      jobs: [...jobs, ...finishedJobs].filter((j) => j.tenantId === id),
      ...(tenant.moveIn && { snapshotName: "Moved in", wpOptionNames: [], phpConstantNames: [] }),
      keepsOwnCode: !!tenant.moveIn,
      moveIn: tenant.moveIn ?? null
    };
  }

  async backups(filter: BackupFilter = {}): Promise<Listing<Backup>> {
    return listing(byProduct(backups, filter.productId));
  }

  async requests(filter: RequestFilter = {}): Promise<RequestLog> {
    const ranges = { ok: [0, 399], "client-error": [400, 499], "server-error": [500, 599], error: [400, 599] } as const;
    const items = requestLog.filter((r) => {
      // A storefront's log also has failed sign-ins with its keys, which carry no storefront.
      const ownKey = r.productId === null && requestLog.some((o) => o.productId === filter.productId && o.apiKeyId === r.apiKeyId);
      if (filter.productId && r.productId !== filter.productId && !ownKey) return false;
      if (filter.from && r.at < filter.from) return false;
      if (filter.tenantId && r.tenantId !== filter.tenantId) return false;
      if (filter.outcome) {
        const [low, high] = ranges[filter.outcome];
        if (r.status < low || r.status > high) return false;
      }
      return true;
    });
    const day = requestLog.filter((r) => Date.parse(r.at) > NOW + HOUR - DAY);
    return {
      items,
      total: items.length,
      last24Hours: {
        total: day.length,
        clientErrors: day.filter((r) => r.status >= 400 && r.status < 500).length,
        serverErrors: day.filter((r) => r.status >= 500).length
      },
      retentionDays: 30
    };
  }

  async jobs(filter: JobFilter = {}): Promise<JobsList> {
    const productName = products.find((p) => p.id === filter.productId)?.name;
    // Like the API: retried failures leave the list (their new job is queued instead).
    const listed = jobs.filter((j) => j.state === "queued" || j.state === "running" || j.state === "failed");
    const items = filter.productId ? listed.filter((j) => j.productName === productName) : listed;
    return {
      items,
      counts: {
        queued: items.filter((j) => j.state === "queued").length,
        running: items.filter((j) => j.state === "running").length,
        failed: items.filter((j) => j.state === "failed").length
      },
      truncated: false
    };
  }

  async products(): Promise<ProductDetail[]> {
    return products.map((p) => ({
      ...p,
      tenantCount: tenants.filter((t) => t.productId === p.id).length,
      versionCount: versions.filter((v) => v.productId === p.id).length,
      productionVersionId: versions.find((v) => v.productId === p.id && v.isProduction)?.id ?? null
    }));
  }

  private product(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) throw new FixtureError(404, `Product ${productId} not found`);
    return product;
  }

  async versions(productId: string): Promise<Version[]> {
    this.product(productId);
    return versions.filter((v) => v.productId === productId).map((v) => without(v, "productId"));
  }

  async templates(productId: string): Promise<Template[]> {
    this.product(productId);
    return templates.filter((t) => t.productId === productId).map((t) => without(t, "productId"));
  }

  async moveSiteIn(productId: string, input: { name: string; size: StoreSize }): Promise<ImportCode> {
    const product = this.product(productId);
    const name = input.name.trim();
    if (!name) throw new FixtureError(400, "name is required");
    const id = uuid(500 + tenants.length, 3);
    const base = `t-${id.slice(-8)}.stores.waas.example`;
    const now = new Date().toISOString();
    tenants.push({
      id,
      externalId: id,
      name,
      productId: product.id,
      productName: product.name,
      versionId: versions.find((v) => v.productId === product.id && v.isProduction)?.id ?? versions[0].id,
      versionName: versions.find((v) => v.productId === product.id && v.isProduction)?.name ?? versions[0].name,
      statusCode: StatusCode.Pending,
      isSuspended: false,
      dateSuspended: null,
      mainDomain: base,
      domainCount: 1,
      domains: [{ domainName: base, isMain: true, isBase: true }],
      latestBackupAt: null,
      dateCreated: now,
      dateChanged: now,
      moveIn: { expiresAt: new Date(Date.now() + 7 * DAY).toISOString(), startedAt: null, source: null }
    });
    return this.importCode(id);
  }

  async renewImportCode(tenantId: string): Promise<ImportCode> {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) throw new FixtureError(404, `Tenant ${tenantId} not found`);
    if (!tenant.moveIn || tenant.moveIn.startedAt) throw new FixtureError(400, "This store is not waiting for a site to be moved in");
    tenant.moveIn.expiresAt = new Date(Date.now() + 7 * DAY).toISOString();
    return this.importCode(tenantId);
  }

  private importCode(tenantId: string): ImportCode {
    const code = Buffer.from(JSON.stringify({ u: "https://api.example", t: randomBytes(24).toString("base64url") })).toString("base64url");
    return { tenantId, externalId: tenantId, importCode: `AP1.${code}`, pluginUrl: "https://api.example/imports/plugin.zip" };
  }

  async restoreBackup(tenantId: string, backupId: string, takeBackup: boolean): Promise<void> {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) throw new FixtureError(404, `Tenant ${tenantId} not found`);
    const backup = backups.find((b) => b.id === backupId && b.tenantId === tenantId && b.statusCode === StatusCode.Done);
    if (!backup) throw new FixtureError(400, `Backup ${backupId} is not a Done backup of this store`);
    if (takeBackup) {
      backups.unshift({
        ...backup,
        id: uuid(200 + backups.length, 4),
        reason: "before-restore",
        dateCreated: new Date().toISOString()
      });
    }
    tenant.dateChanged = new Date().toISOString();
  }

  async setMainDomain(tenantId: string, domainName: string): Promise<void> {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) throw new FixtureError(404, `Tenant ${tenantId} not found`);
    const domain = domainName.trim().toLowerCase();
    if (tenants.some((t) => t !== tenant && t.domains.some((d) => d.domainName === domain)))
      throw new FixtureError(400, `Domain ${domain} is already in use`);
    for (const d of tenant.domains) d.isMain = false;
    const existing = tenant.domains.find((d) => d.domainName === domain);
    if (existing) existing.isMain = true;
    else tenant.domains.push({ domainName: domain, isMain: true, isBase: false });
    tenant.mainDomain = domain;
    tenant.domainCount = tenant.domains.length;
  }

  async mailDomain(tenantId: string): Promise<MailDomain | null> {
    if (!tenants.some((t) => t.id === tenantId)) throw new FixtureError(404, `Tenant ${tenantId} not found`);
    return mailDomains.get(tenantId) ?? null;
  }

  async setMailDomain(tenantId: string, domainName: string): Promise<MailDomain> {
    if (!tenants.some((t) => t.id === tenantId)) throw new FixtureError(404, `Tenant ${tenantId} not found`);
    const domain = domainName.trim().toLowerCase();
    const existing = mailDomains.get(tenantId);
    if (existing && existing.domainName === domain) return existing;
    if (existing) throw new FixtureError(400, `This store already has the sending domain ${existing.domainName}; remove it first`);
    const mailDomain: MailDomain = {
      domainName: domain,
      status: "pending",
      dateCreated: new Date().toISOString(),
      dateVerified: null,
      records: [
        { type: "TXT", name: "tosend._domainkey", host: `tosend._domainkey.${domain}`, value: "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC7sample", priority: null },
        { type: "MX", name: "send", host: `send.${domain}`, value: "feedback-smtp.us-east-1.amazonses.com", priority: 10 },
        { type: "TXT", name: "send", host: `send.${domain}`, value: "v=spf1 include:amazonses.com ~all", priority: null }
      ]
    };
    mailDomains.set(tenantId, mailDomain);
    return mailDomain;
  }

  async removeMailDomain(tenantId: string): Promise<void> {
    const existing = mailDomains.get(tenantId);
    if (!existing) throw new FixtureError(404, "This store has no sending domain");
    existing.status = "removing";
  }

  async domainConnect(tenantId: string, domainName: string, service: "website" | "email"): Promise<DomainConnectLink> {
    if (!tenants.some((t) => t.id === tenantId)) throw new FixtureError(404, `Tenant ${tenantId} not found`);
    // A domain that already has another DKIM key: no link, the reason instead (as the API answers).
    if (service === "email" && domainName.startsWith("conflict.")) {
      return {
        dnsProvider: "Example DNS",
        supported: false,
        url: null,
        conflict: `tosend._domainkey.${domainName} already has a different email signing (DKIM) key. Replace it with the one below by hand: one-click setup would add a second key next to it, and email would fail its checks.`
      };
    }
    const query = new URLSearchParams({ domain: domainName, ...(service === "email" ? { dkim: "p=sample" } : { ip: "203.0.113.7" }) });
    return {
      dnsProvider: "Example DNS",
      supported: true,
      url: `https://domainconnect.example.com/v2/domainTemplates/providers/anypress.io/services/${service}/apply?${query}`
    };
  }

  async retryFailure(failureId: string): Promise<void> {
    const job = jobs.find((j) => j.id === failureId && (j.state === "failed" || j.state === "retried"));
    if (!job) throw new FixtureError(404, `Failure ${failureId} not found`);
    if (job.state === "retried") return;
    job.state = "retried";
    job.retriedAt = new Date().toISOString();
    jobs.push({ ...job, id: uuid(jobs.length + 100, 5), state: "queued", createdAt: job.retriedAt, failedAt: null, error: null, retriedAt: null, attempts: 0 });
  }

  async createVersion(productId: string, input: CreateVersionInput): Promise<Created> {
    this.product(productId);
    if (!VERSION_NAME.test(input.name))
      throw new FixtureError(400, "The version name can be at most 30 characters: letters, digits, dashes and dots");
    if (versions.some((v) => v.productId === productId && v.name === input.name))
      throw new FixtureError(400, `A version named ${input.name} already exists`);
    if (!input.useCustomUpload && !input.snapshotId) throw new FixtureError(400, "Choose a template or upload an archive");
    const id = uuid(versions.length + 50, 2);
    versions.push({
      id,
      productId,
      name: input.name,
      isProduction: false,
      statusCode: input.useCustomUpload ? StatusCode.Pending : StatusCode.Done,
      domain: `${input.name.replace(/\./g, "-")}-${id.slice(-8)}.versions.waas.example`,
      dateCreated: new Date().toISOString(),
      dateChanged: new Date().toISOString()
    });
    return { id, uploadUrl: input.useCustomUpload ? FIXTURE_UPLOAD_URL : null };
  }

  async setProductionVersion(productId: string, versionId: string): Promise<void> {
    this.product(productId);
    const version = versions.find((v) => v.productId === productId && v.id === versionId);
    if (!version) throw new FixtureError(404, `Version ${versionId} not found`);
    if (version.statusCode !== StatusCode.Done)
      throw new FixtureError(400, `Version ${versionId} is ${version.statusCode === StatusCode.Pending ? "Pending" : "not Done"}, not Done`);
    for (const v of versions) if (v.productId === productId) v.isProduction = v.id === versionId;
  }

  async deleteVersion(productId: string, versionId: string): Promise<void> {
    this.product(productId);
    const index = versions.findIndex((v) => v.productId === productId && v.id === versionId);
    if (index < 0) throw new FixtureError(404, `Version ${versionId} not found`);
    if (versions[index].isProduction) throw new FixtureError(400, "The production version cannot be removed");
    if (tenants.some((t) => t.versionId === versionId))
      throw new FixtureError(400, "Stores still run on this version; move them first");
    versions.splice(index, 1);
  }

  async createTemplate(productId: string, input: CreateTemplateInput): Promise<Created> {
    this.product(productId);
    if (!TEMPLATE_NAME.test(input.name))
      throw new FixtureError(400, "The template name must be 5 to 50 characters: letters, digits, spaces and dashes");
    if (!input.isTenantSnapshot && input.groupName) throw new FixtureError(400, "Only a group template has a group name");
    const id = uuid(templates.length + 50, 7);
    templates.push({
      id,
      productId,
      name: input.name,
      comment: input.comment,
      isTenantSnapshot: input.isTenantSnapshot,
      groupName: input.isTenantSnapshot ? (input.groupName ?? null) : null,
      isDefault: false,
      showAsBaseSnapshot: input.showInConsole
    });
    return { id, uploadUrl: FIXTURE_UPLOAD_URL };
  }

  async deleteTemplate(productId: string, templateId: string): Promise<void> {
    this.product(productId);
    const index = templates.findIndex((t) => t.productId === productId && t.id === templateId);
    if (index < 0) throw new FixtureError(404, `Template ${templateId} not found`);
    templates.splice(index, 1);
  }

  private webhook(id: string): FixtureWebhook {
    const webhook = webhooks.find((w) => w.id === id);
    if (!webhook) throw new FixtureError(404, "Webhook endpoint not found");
    return webhook;
  }

  async webhooks(productId?: string): Promise<WebhookEndpoint[]> {
    const dayAgo = Date.now() - DAY;
    return byProduct(webhooks, productId)
      .map((w): WebhookEndpoint => {
        const sent = webhookDeliveries.filter((d) => d.endpointId === w.id);
        const recent = sent.filter((d) => Date.parse(d.dateCreated) > dayAgo);
        return {
          ...without(w, "secret"),
          productName: products.find((p) => p.id === w.productId)!.name,
          last24Hours: { sent: recent.length, failed: recent.filter((d) => d.status === "failed").length },
          pending: sent.filter((d) => d.status === "pending").length,
          lastAttemptAt:
            sent
              .map((d) => d.lastAttemptAt)
              .filter((at): at is string => !!at)
              .sort()
              .at(-1) ?? null
        };
      })
      .sort((a, b) => a.productName.localeCompare(b.productName) || a.dateCreated.localeCompare(b.dateCreated));
  }

  async webhookDeliveries(filter: WebhookFilter = {}): Promise<Listing<WebhookDelivery>> {
    const items = webhookDeliveries
      .filter(
        (d) =>
          (!filter.productId || d.productId === filter.productId) &&
          (!filter.endpointId || d.endpointId === filter.endpointId) &&
          (!filter.status || d.status === filter.status) &&
          (!filter.tenantId || d.tenantId === filter.tenantId)
      )
      .sort((a, b) => b.dateCreated.localeCompare(a.dateCreated));
    return listing(items);
  }

  private checkWebhookUrl(value: string): string {
    let url: URL;
    try {
      url = new URL(value.trim());
    } catch {
      throw new FixtureError(400, "url is not a valid URL");
    }
    if (url.protocol !== "https:") throw new FixtureError(400, "url must start with https://");
    return url.href;
  }

  async createWebhook(productId: string, input: WebhookEndpointInput): Promise<WebhookSecret> {
    this.product(productId);
    const url = this.checkWebhookUrl(input.url);
    if (webhooks.filter((w) => w.productId === productId).length >= 10)
      throw new FixtureError(400, "A storefront can have at most 10 webhook endpoints");
    const now = new Date().toISOString();
    const webhook: FixtureWebhook = {
      id: uuid(webhooks.length + 50, 10),
      url,
      description: input.description,
      eventTypes: [...new Set(input.eventTypes)],
      enabled: true,
      productId,
      apiKeyId: null,
      secret: newSecret(),
      dateCreated: now,
      dateChanged: now
    };
    webhooks.push(webhook);
    return without(webhook, "productId", "apiKeyId");
  }

  async updateWebhook(id: string, change: WebhookEndpointChange): Promise<void> {
    const webhook = this.webhook(id);
    if (change.url !== undefined) webhook.url = this.checkWebhookUrl(change.url);
    if (change.description !== undefined) webhook.description = change.description;
    if (change.eventTypes !== undefined) webhook.eventTypes = [...new Set(change.eventTypes)];
    if (change.enabled !== undefined) webhook.enabled = change.enabled;
    webhook.dateChanged = new Date().toISOString();
  }

  async deleteWebhook(id: string): Promise<void> {
    webhooks.splice(webhooks.indexOf(this.webhook(id)), 1);
    for (let i = webhookDeliveries.length - 1; i >= 0; i--) if (webhookDeliveries[i].endpointId === id) webhookDeliveries.splice(i, 1);
  }

  async rotateWebhookSecret(id: string): Promise<string> {
    const webhook = this.webhook(id);
    webhook.secret = newSecret();
    webhook.dateChanged = new Date().toISOString();
    return webhook.secret;
  }

  async testWebhook(id: string): Promise<void> {
    const webhook = this.webhook(id);
    const product = products.find((p) => p.id === webhook.productId)!;
    const now = new Date().toISOString();
    // Sample endpoints answer at once.
    webhookDeliveries.unshift({
      id: uuid(webhookDeliveries.length + 100, 11),
      eventId: uuid(webhookDeliveries.length + 100, 12),
      eventType: "webhook.test",
      endpointId: webhook.id,
      url: webhook.url,
      productId: product.id,
      productName: product.name,
      tenantId: null,
      tenantName: null,
      versionId: null,
      status: "delivered",
      attempts: 1,
      responseStatus: 200,
      responseBody: '{"received":true}',
      error: null,
      durationMs: 140,
      dateCreated: now,
      lastAttemptAt: now
    });
  }

  async retryWebhookDelivery(id: string): Promise<void> {
    const delivery = webhookDeliveries.find((d) => d.id === id);
    if (!delivery) throw new FixtureError(404, "Delivery not found");
    if (delivery.status === "pending") throw new FixtureError(400, "This delivery is still being sent");
    delivery.status = "pending";
    delivery.attempts = 0;
  }

  async apiKeys(productId: string): Promise<ApiKey[]> {
    this.product(productId);
    return apiKeys
      .filter((k) => k.productId === productId)
      .sort((a, b) => b.dateCreated.localeCompare(a.dateCreated))
      .map((k) => without(k, "productId"));
  }

  async createAgency(input: NewAgencyInput): Promise<NewAgency> {
    const id = uuid(products.length + 1, 1);
    products.push({ id, name: input.name });
    return { productId: id, name: input.name, key: await this.createApiKey(id, "Storefront") };
  }

  async storefront(productId: string): Promise<ReadyStorefront | null> {
    this.product(productId);
    return storefronts.get(productId) ?? null;
  }

  async createStorefront(productId: string, input: NewStorefrontInput): Promise<ReadyStorefront> {
    this.product(productId);
    if (storefronts.has(productId)) throw new Error("This product already has a ready-made storefront");
    await this.createApiKey(productId, "Ready-made storefront");
    const storefront: ReadyStorefront = {
      id: uuid(storefronts.size + 1, 8),
      name: input.name,
      domain: input.subdomain ? `${input.subdomain}.anypress.site` : `t-${productId.slice(0, 8)}.stores.anypress.site`,
      statusCode: 0,
      statusName: "Pending"
    };
    storefronts.set(productId, storefront);
    return storefront;
  }

  async createApiKey(productId: string, label: string | null): Promise<NewApiKey> {
    this.product(productId);
    const key: FixtureKey = {
      id: uuid(apiKeys.length + 1, 9),
      productId,
      label,
      state: "active",
      dateCreated: new Date().toISOString(),
      lastUsedAt: null,
      revokedAt: null
    };
    apiKeys.push(key);
    return { ...without(key, "productId"), secret: sampleSecret() };
  }

  async rotateApiKey(productId: string, keyId: string, graceHours: number): Promise<NewApiKey> {
    const old = apiKeys.find((k) => k.productId === productId && k.id === keyId);
    if (!old) throw new FixtureError(404, `API key ${keyId} not found`);
    if (old.state !== "active") throw new FixtureError(409, "Only an active key can be rotated");
    old.state = graceHours > 0 ? "expiring" : "revoked";
    old.revokedAt = new Date(Date.now() + graceHours * HOUR).toISOString();
    return this.createApiKey(productId, old.label);
  }

  async revokeApiKey(productId: string, keyId: string): Promise<void> {
    const key = apiKeys.find((k) => k.productId === productId && k.id === keyId);
    if (!key) throw new FixtureError(404, `API key ${keyId} not found`);
    if (key.state === "revoked") return;
    key.state = "revoked";
    key.revokedAt = new Date().toISOString();
  }

  private teamOf(productId: string): FixtureTeam {
    const product = this.product(productId);
    let team = teams.find((t) => t.productId === productId);
    if (!team) {
      team = { productId, organization: null, members: [], invitations: [] };
      teams.push(team);
    }
    team.organization ??= { id: uuid(teams.length, 12), name: product.name };
    return team;
  }

  async applications(status?: ApplicationStatus): Promise<SellerApplication[]> {
    return applications.filter((a) => !status || a.status === status).sort((a, b) => b.dateCreated.localeCompare(a.dateCreated));
  }

  async application(id: string): Promise<SellerApplication | null> {
    return applications.find((a) => a.id === id) ?? null;
  }

  async approveApplication(id: string, input: { maxTenants: number | null; storefront: boolean }): Promise<ApprovedApplication> {
    const application = this.pendingApplication(id);
    const agency = await this.createAgency({ name: application.business, maxTenants: input.maxTenants });
    Object.assign(application, { status: "approved", productId: agency.productId, dateDecided: new Date().toISOString() });
    const storefront = input.storefront
      ? await this.createStorefront(agency.productId, {
          name: application.business,
          email: application.email,
          subdomain: application.storefrontSubdomain ?? undefined
        })
      : undefined;
    return { productId: agency.productId, invitation: { acceptUrl: `https://app.anypress.io/invite/${id}`, emailed: true }, storefront };
  }

  async declineApplication(id: string): Promise<void> {
    Object.assign(this.pendingApplication(id), { status: "declined", dateDecided: new Date().toISOString() });
  }

  private pendingApplication(id: string): SellerApplication {
    const application = applications.find((a) => a.id === id);
    if (!application) throw new AdminApiError(404, `/admin/applications/${id}`, `Application ${id} not found`);
    if (application.status !== "pending") throw new AdminApiError(409, `/admin/applications/${id}`, "This application was already decided");
    return application;
  }

  async team(productId: string): Promise<Team> {
    this.product(productId);
    const team = teams.find((t) => t.productId === productId);
    return team ? structuredClone(without(team, "productId")) : { organization: null, members: [], invitations: [] };
  }

  async invite(productId: string, email: string, role: TeamRole): Promise<NewInvitation> {
    const team = this.teamOf(productId);
    if (team.members.some((m) => m.email === email)) throw new FixtureError(409, `${email} is already a member`);
    team.invitations = team.invitations.filter((i) => i.email !== email);
    const id = uuid(100 + team.invitations.length, 15);
    const invitation = {
      id,
      email,
      role,
      expiresAt: new Date(Date.now() + 7 * DAY).toISOString(),
      dateCreated: new Date().toISOString(),
      acceptUrl: `https://app.example.com/invite/${id}`
    };
    team.invitations.unshift(invitation);
    return { ...invitation, emailed: true };
  }

  async cancelInvitation(productId: string, invitationId: string): Promise<void> {
    const team = this.teamOf(productId);
    if (!team.invitations.some((i) => i.id === invitationId)) throw new FixtureError(404, `Pending invitation ${invitationId} not found`);
    team.invitations = team.invitations.filter((i) => i.id !== invitationId);
  }

  async setMemberRole(productId: string, memberId: string, role: TeamRole): Promise<void> {
    const team = this.teamOf(productId);
    const member = team.members.find((m) => m.id === memberId);
    if (!member) throw new FixtureError(404, `Member ${memberId} not found`);
    if (member.role === "owner" && role !== "owner" && team.members.filter((m) => m.role === "owner").length === 1)
      throw new FixtureError(409, "A team needs at least one owner.");
    member.role = role;
  }

  async removeMember(productId: string, memberId: string): Promise<void> {
    const team = this.teamOf(productId);
    if (!team.members.some((m) => m.id === memberId)) throw new FixtureError(404, `Member ${memberId} not found`);
    team.members = team.members.filter((m) => m.id !== memberId);
  }
}
