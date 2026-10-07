import "server-only";

import type { AdminApi } from "./client";
import {
  StatusCode,
  type Backup,
  type BackupFilter,
  type Health,
  type Job,
  type JobFilter,
  type JobsList,
  type Listing,
  type Overview,
  type Product,
  type Tenant,
  type TenantDetail,
  type TenantDomain,
  type TenantFilter
} from "./types";

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

const versions = [
  { id: uuid(1, 2), name: "v1.4 (production)", productId: products[0].id },
  { id: uuid(2, 2), name: "v1.5-beta", productId: products[0].id },
  { id: uuid(3, 2), name: "v1.4 (production)", productId: products[1].id }
];

const storeNames = [
  "Northwind Labs", "Blue Harbor Supply", "Cedar Wellness", "Atlas Research", "Lumen Co",
  "Harbor Point", "Summit Peptides", "Kestrel Bio", "Oakline Health", "Riverstone",
  "Meridian Shop", "Pinecrest", "Solace Labs", "Vantage Supply", "Willow & Co",
  "Ironwood", "Brightside", "Coastal Compounds", "Evergreen Labs", "Silverline"
];

type TenantSeed = { status: StatusCode; suspended?: boolean; custom?: string; extra?: string[] };

const seeds: TenantSeed[] = [
  { status: StatusCode.Done, custom: "shop.northwindlabs.com", extra: ["northwindlabs.com"] },
  { status: StatusCode.Done },
  { status: StatusCode.Done, custom: "cedarwellness.co" },
  { status: StatusCode.Pending },
  { status: StatusCode.Done, suspended: true },
  { status: StatusCode.Failed },
  { status: StatusCode.Done, custom: "harborpoint.store" },
  { status: StatusCode.Done },
  { status: StatusCode.Done, suspended: true, custom: "kestrelbio.com" },
  { status: StatusCode.Done },
  { status: StatusCode.Removing },
  { status: StatusCode.Done, custom: "pinecrest.shop", extra: ["www.pinecrest.shop"] },
  { status: StatusCode.Done },
  { status: StatusCode.Pending },
  { status: StatusCode.Done },
  { status: StatusCode.Pending, custom: "ironwood.store" },
  { status: StatusCode.Done },
  { status: StatusCode.Done },
  { status: StatusCode.Done },
  { status: StatusCode.Done, custom: "silverline.shop" }
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
  [1, "Copperleaf Labs", 12],
  [2, "Driftwood Supply", 81]
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
    error: "Provisioner: certificate request for ironwood.store rejected: DNS does not point at the store host"
  }),
  job(7, "failed", "tenant.backup", tenants[6], 2880, {
    error: "Provisioner: backup upload to object storage failed (403 AccessDenied)"
  })
];

/** Finished jobs, shown only on a store's page (the API's recentJobs). */
const finishedJobs: Job[] = tenants.map((tenant, i) =>
  job(50 + i, "done", "tenant.create", tenant, (60 - i * 2.5) * 24 * 60)
);

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

function toRow(t: FixtureTenant): Tenant {
  const { domains: _domains, dateSuspended: _suspended, dateChanged: _changed, ...row } = t;
  return row;
}

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
      snapshotName: "Peptide shop starter",
      wpOptionNames: ["blogname", "admin_email", "woocommerce_currency"],
      phpConstantNames: ["WPCS_TENANT_ROLES", "WPCS_PUBLIC_KEY", "WPCS_TENANT_NO_ADMINISTRATOR_PLUGIN_CAPS"],
      backups: backups.filter((b) => b.tenantId === id),
      jobs: [...jobs, ...finishedJobs].filter((j) => j.tenantId === id)
    };
  }

  async backups(filter: BackupFilter = {}): Promise<Listing<Backup>> {
    return listing(byProduct(backups, filter.productId));
  }

  async jobs(filter: JobFilter = {}): Promise<JobsList> {
    const productName = products.find((p) => p.id === filter.productId)?.name;
    const items = filter.productId ? jobs.filter((j) => j.productName === productName) : jobs;
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
}
