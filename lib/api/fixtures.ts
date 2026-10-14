import "server-only";

import type { AdminApi } from "./client";
import {
  StatusCode,
  type ApiKey,
  type NewAgency,
  type NewAgencyInput,
  type NewApiKey,
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
  type Version
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
      userAgent: "node"
    };
  if (kind % 2 === 0)
    return { ...base, method: "GET", path: "/v1/tenants", query: `externalId=sub_${1000 + i}`, externalId: `sub_${1000 + i}`, status: 200, durationMs: 9 + (i % 7), tenantId: null, tenantName: null };
  return { ...base, method: "GET", path: "/v1/plugins/waas-host/update", query: "channel=stable&version=2.3.0", status: 200, durationMs: 18, tenantId: null, tenantName: null };
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

export class FixtureAdminApi implements AdminApi {
  readonly isFixture = true;

  async overview(): Promise<Overview> {
    return {
      health: health(),
      products: products.map((p) => ({ ...p, tenantCount: tenants.filter((t) => t.productId === p.id).length })),
      tenants: { ...counts(tenants), total: tenants.length, suspended: tenants.filter((t) => t.isSuspended).length },
      versions: { pending: 0, done: versions.length, failed: 0, removing: 0 },
      backups: { ...counts(backups), total: backups.length },
      jobs: {
        queued: jobs.filter((j) => j.state === "queued").length,
        running: jobs.filter((j) => j.state === "running").length,
        failed: jobs.filter((j) => j.state === "failed").length
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
      jobs: [...jobs, ...finishedJobs].filter((j) => j.tenantId === id)
    };
  }

  async backups(filter: BackupFilter = {}): Promise<Listing<Backup>> {
    return listing(byProduct(backups, filter.productId));
  }

  async requests(filter: RequestFilter = {}): Promise<RequestLog> {
    const ranges = { ok: [0, 399], "client-error": [400, 499], "server-error": [500, 599], error: [400, 599] } as const;
    const items = requestLog.filter((r) => {
      if (filter.productId && r.productId !== filter.productId) return false;
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
}
