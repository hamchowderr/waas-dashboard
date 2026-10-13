import "server-only";

import type { AdminApi } from "./client";
import type {
  Backup,
  BackupFilter,
  Created,
  CreateTemplateInput,
  CreateVersionInput,
  ProductDetail,
  Template,
  Version,
  Job,
  JobFilter,
  JobState,
  JobsList,
  Listing,
  Overview,
  StatusCode,
  Tenant,
  TenantDetail,
  TenantFilter
} from "./types";
import type {
  WireBaseSnapshot,
  WireCreateBaseSnapshot,
  WireCreatedBaseSnapshot,
  WireCreatedVersion,
  WireCreateVersion,
  WireError,
  WireProduct,
  WireVersion,
  WireBackup,
  WireJob,
  WireJobFailure,
  WireJobsPage,
  WireOverview,
  WirePage,
  WireTenantDetail,
  WireTenantRow
} from "./wire";

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    /** The API's own message ({statusCode, message} body), when it sent one. */
    readonly apiMessage: string | null = null
  ) {
    super(apiMessage ?? `Provisioning API returned ${status} for ${path}`);
  }
}

async function apiMessage(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as Partial<WireError>;
    return typeof body.message === "string" ? body.message : null;
  } catch {
    return null;
  }
}

/** The spec's largest page. */
const PAGE_SIZE = 200;
/** v1 loads lists whole and filters in the browser; this caps one list at 2,000 rows. */
const MAX_PAGES = 10;

type Query = Record<string, string | number | undefined>;

function withQuery(path: string, params: Query): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `${path}?${text}` : path;
}

const jobState: Record<WireJob["state"], JobState> = {
  created: "queued",
  retry: "queued",
  active: "running",
  completed: "done",
  cancelled: "cancelled",
  failed: "failed"
};

type TenantName = { name: string; productId: string; productName: string };

/** Calls the admin endpoints with the admin token. Responses are never cached. */
export class HttpAdminApi implements AdminApi {
  readonly isFixture = false;
  private tenantIndex?: Promise<Map<string, TenantName>>;
  private overviewBody?: Promise<WireOverview>;

  constructor(
    private readonly baseUrl: string,
    private readonly token: string
  ) {}

  private async get<T>(path: string, { allow404 = false } = {}): Promise<T | null> {
    const response = await fetch(new URL(path, this.baseUrl), {
      headers: { Authorization: `Bearer ${this.token}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000)
    });
    if (allow404 && response.status === 404) return null;
    if (!response.ok) throw new AdminApiError(response.status, path, await apiMessage(response));
    return (await response.json()) as T;
  }

  /** A change. Returns the JSON body, or null for the API's bodiless 200s. */
  private async send<T>(method: "POST" | "PUT" | "DELETE", path: string, body?: unknown): Promise<T | null> {
    const response = await fetch(new URL(path, this.baseUrl), {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" })
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) throw new AdminApiError(response.status, path, await apiMessage(response));
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : null;
  }

  private productPath(productId: string, rest: string): string {
    return `/admin/products/${encodeURIComponent(productId)}${rest}`;
  }

  async products(): Promise<ProductDetail[]> {
    const products = (await this.get<WireProduct[]>("/admin/products"))!;
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      tenantCount: p.tenantCount,
      versionCount: p.versionCount,
      productionVersionId: p.productionVersionId
    }));
  }

  async versions(productId: string): Promise<Version[]> {
    const versions = (await this.get<WireVersion[]>(this.productPath(productId, "/versions")))!;
    return versions.map((v) => ({
      id: v.id,
      name: v.name,
      isProduction: v.isProduction,
      statusCode: v.statusCode as StatusCode,
      domain: v.domain,
      dateCreated: v.dateCreated,
      dateChanged: v.dateChanged
    }));
  }

  async templates(productId: string): Promise<Template[]> {
    const templates = (await this.get<WireBaseSnapshot[]>(this.productPath(productId, "/basesnapshots")))!;
    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      comment: t.comment ?? "",
      isTenantSnapshot: t.isTenantSnapshot ?? false,
      groupName: t.groupName || null,
      isDefault: t.isDefault ?? false,
      showAsBaseSnapshot: t.showAsBaseSnapshot ?? false
    }));
  }

  async retryFailure(failureId: string): Promise<void> {
    await this.send("POST", `/admin/jobs/failures/${encodeURIComponent(failureId)}/retry`);
  }

  async setMainDomain(tenantId: string, domainName: string): Promise<void> {
    await this.send("PUT", `/admin/tenants/${encodeURIComponent(tenantId)}/domains/main`, { domainName });
  }

  async createVersion(productId: string, input: CreateVersionInput): Promise<Created> {
    const body: WireCreateVersion = input;
    const created = (await this.send<WireCreatedVersion>("POST", this.productPath(productId, "/versions"), body))!;
    return { id: created.id, uploadUrl: created.uploadUrl || null };
  }

  async setProductionVersion(productId: string, versionId: string): Promise<void> {
    await this.send("PUT", this.productPath(productId, `/versions/${encodeURIComponent(versionId)}/production`));
  }

  async deleteVersion(productId: string, versionId: string): Promise<void> {
    await this.send("DELETE", this.productPath(productId, `/versions/${encodeURIComponent(versionId)}`));
  }

  async createTemplate(productId: string, input: CreateTemplateInput): Promise<Created> {
    const body: WireCreateBaseSnapshot = {
      name: input.name,
      comment: input.comment,
      isTenantSnapshot: input.isTenantSnapshot,
      showInConsole: input.showInConsole,
      ...(input.isTenantSnapshot && input.groupName ? { groupName: input.groupName } : {})
    };
    const created = (await this.send<WireCreatedBaseSnapshot>("POST", this.productPath(productId, "/basesnapshots"), body))!;
    return { id: created.id, uploadUrl: created.uploadUrl || null };
  }

  async deleteTemplate(productId: string, templateId: string): Promise<void> {
    await this.send("DELETE", this.productPath(productId, `/basesnapshots?id=${encodeURIComponent(templateId)}`));
  }

  /** Every page of a list, up to MAX_PAGES. */
  private async getAll<T>(path: string, params: Query = {}): Promise<Listing<T> & { first: WirePage<T> }> {
    const first = (await this.get<WirePage<T>>(withQuery(path, { ...params, page: 1, pageSize: PAGE_SIZE })))!;
    const items = [...first.items];
    const pages = Math.min(Math.ceil(first.total / PAGE_SIZE), MAX_PAGES);
    for (let page = 2; page <= pages; page++) {
      const next = (await this.get<WirePage<T>>(withQuery(path, { ...params, page, pageSize: PAGE_SIZE })))!;
      items.push(...next.items);
    }
    return { items, total: first.total, first };
  }

  private wireOverview(): Promise<WireOverview> {
    this.overviewBody ??= this.get<WireOverview>("/admin/overview").then((body) => body!);
    return this.overviewBody;
  }

  /** Store and storefront names by tenant id; the backups and jobs lists carry ids only. */
  private tenantNames(): Promise<Map<string, TenantName>> {
    this.tenantIndex ??= this.getAll<WireTenantRow>("/admin/tenants").then(
      ({ items }) => new Map(items.map((t) => [t.id, { name: t.name, productId: t.productId, productName: t.productName }]))
    );
    return this.tenantIndex;
  }

  async overview(): Promise<Overview> {
    const o = await this.wireOverview();
    const up = (check: "ok" | "down") => (check === "ok" ? "up" : "down");
    const sum = (c: { pending: number; done: number; failed: number; removing: number }) =>
      c.pending + c.done + c.failed + c.removing;
    return {
      health: {
        ok: o.health.ok,
        checks: { database: up(o.health.database), queue: up(o.health.queue) },
        checkedAt: new Date().toISOString()
      },
      products: o.products,
      tenants: { ...o.tenants, total: sum(o.tenants) },
      versions: o.versions,
      backups: { ...o.backups, total: sum(o.backups) },
      jobs: o.jobs
    };
  }

  async tenants(filter: TenantFilter = {}): Promise<Listing<Tenant>> {
    const { items, total } = await this.getAll<WireTenantRow>("/admin/tenants", { productId: filter.productId });
    return {
      total,
      items: items.map((t) => ({
        id: t.id,
        externalId: t.externalId,
        name: t.name,
        productId: t.productId,
        productName: t.productName,
        versionId: t.versionId,
        versionName: t.versionName,
        mainDomain: t.mainDomain,
        domainCount: t.domainCount,
        statusCode: t.statusCode as StatusCode,
        isSuspended: t.isSuspended,
        latestBackupAt: t.latestBackupAt,
        dateCreated: t.dateCreated
      }))
    };
  }

  async tenant(id: string): Promise<TenantDetail | null> {
    const t = await this.get<WireTenantDetail>(`/admin/tenants/${encodeURIComponent(id)}`, { allow404: true });
    if (!t) return null;
    const names = new Map([[t.id, { name: t.name, productId: t.productId, productName: t.productName }]]);
    const products = new Map([[t.productId, t.productName]]);
    // A job that used up its retries is also a completed pg-boss job; show it once, as the failure.
    const failedJobIds = new Set(t.failures.map((f) => f.jobId));
    const jobs = [
      ...t.failures.map((f) => this.failureToJob(f, names)),
      ...t.recentJobs.filter((j) => !failedJobIds.has(j.id)).map((j) => this.jobToJob(j, names))
    ].sort((a, b) => (b.failedAt ?? b.createdAt ?? "").localeCompare(a.failedAt ?? a.createdAt ?? ""));
    const main = t.domains.find((d) => d.isMainDomain);
    return {
      id: t.id,
      externalId: t.externalId,
      name: t.name,
      productId: t.productId,
      productName: t.productName,
      versionId: t.versionId,
      versionName: t.versionName,
      snapshotName: t.snapshotName ?? null,
      statusCode: t.statusCode as StatusCode,
      isSuspended: t.isSuspended,
      dateSuspended: t.dateSuspended ?? null,
      dateCreated: t.dateCreated ?? null,
      dateChanged: t.dateChanged ?? null,
      mainDomain: main?.domainName ?? null,
      domains: t.domains.map((d) => ({ domainName: d.domainName, isMain: d.isMainDomain, isBase: d.isBaseDomain })),
      wpOptionNames: t.wpOptionNames,
      phpConstantNames: t.phpConstantNames,
      backups: t.backups.map((b) => this.toBackup(b, names, products)),
      jobs
    };
  }

  async backups(filter: BackupFilter = {}): Promise<Listing<Backup>> {
    const [{ items, total }, names, overview] = await Promise.all([
      this.getAll<WireBackup>("/admin/backups", { productId: filter.productId }),
      this.tenantNames(),
      this.wireOverview()
    ]);
    const products = new Map(overview.products.map((p) => [p.id, p.name]));
    return { total, items: items.map((b) => this.toBackup(b, names, products)) };
  }

  async jobs(filter: JobFilter = {}): Promise<JobsList> {
    const states = ["queued", "running", "failed"] as const;
    const [pages, names] = await Promise.all([
      Promise.all(states.map((state) => this.getAll<WireJob | WireJobFailure>("/admin/jobs", { state }))),
      this.tenantNames()
    ]);
    const counts = (pages[0].first as WireJobsPage).counts;
    const items = pages
      .flatMap((p) => p.items)
      .map((j) => ("errorMessage" in j ? this.failureToJob(j, names) : this.jobToJob(j, names)))
      .filter((j) => !filter.productId || (j.tenantId && names.get(j.tenantId)?.productId === filter.productId));
    return {
      items,
      counts,
      truncated: pages.some((p) => p.items.length < p.total)
    };
  }

  private toBackup(b: WireBackup, names: Map<string, TenantName>, products: Map<string, string>): Backup {
    return {
      id: b.id,
      productId: b.productId,
      productName: products.get(b.productId) ?? b.productId,
      tenantId: b.tenantId,
      externalId: b.externalId,
      tenantName: names.get(b.tenantId)?.name ?? null,
      reason: b.reason,
      sizeBytes: b.sizeBytes,
      statusCode: b.statusCode as StatusCode,
      dateCreated: b.dateCreated,
      tenantDeletedAt: b.tenantDeletedAt,
      expiresAt: b.expiresAt
    };
  }

  private jobToJob(j: WireJob, names: Map<string, TenantName>): Job {
    const tenant = j.tenantId ? names.get(j.tenantId) : undefined;
    return {
      id: j.id,
      state: jobState[j.state],
      type: j.type,
      tenantId: j.tenantId,
      versionId: j.versionId,
      targetName: tenant?.name ?? null,
      productName: tenant?.productName ?? null,
      attempts: j.attempts,
      createdAt: j.createdOn,
      startedAt: j.startedOn ?? null,
      failedAt: null,
      error: null,
      retriedAt: null
    };
  }

  private failureToJob(f: WireJobFailure, names: Map<string, TenantName>): Job {
    const tenant = f.tenantId ? names.get(f.tenantId) : undefined;
    return {
      id: f.id,
      state: f.status === "retried" ? "retried" : "failed",
      type: f.type,
      tenantId: f.tenantId,
      versionId: f.versionId,
      targetName: tenant?.name ?? null,
      productName: tenant?.productName ?? null,
      attempts: f.attempts,
      createdAt: null,
      startedAt: null,
      failedAt: f.failedAt,
      error: f.errorMessage,
      retriedAt: f.retriedAt
    };
  }
}
