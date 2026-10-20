import "server-only";

import type { AdminApi } from "./client";
import type {
  ImportCode,
  MoveIn,
  StoreSize,
  ApiKey,
  ApplicationStatus,
  ApprovedApplication,
  SellerApplication,
  NewAgency,
  NewAgencyInput,
  NewStorefrontInput,
  ReadyStorefront,
  NewApiKey,
  NewInvitation,
  Team,
  TeamRole,
  Backup,
  BackupFilter,
  Created,
  CreateTemplateInput,
  CreateVersionInput,
  ProductDetail,
  Client,
  Reseller,
  ResellerBill,
  ResellerSettings,
  ResellerUsage,
  Template,
  Version,
  Job,
  JobFilter,
  JobState,
  JobsList,
  Listing,
  DomainConnectLink,
  MailDomain,
  Overview,
  RequestFilter,
  RequestLog,
  StatusCode,
  Tenant,
  TenantDetail,
  TenantFilter,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEndpointChange,
  WebhookEndpointInput,
  WebhookFilter,
  WebhookSecret
} from "./types";
import type {
  WireApiKey,
  WireCreatedProduct,
  WireStorefront,
  WireApprovedApplication,
  WireNewApiKey,
  WireRotatedApiKey,
  WireInvitation,
  WireOrganizationView,
  WireBaseSnapshot,
  WireCreateBaseSnapshot,
  WireCreatedBaseSnapshot,
  WireCreatedVersion,
  WireCreateVersion,
  WireError,
  WireProduct,
  WireReseller,
  WireVersion,
  WireBackup,
  WireJob,
  WireJobFailure,
  WireJobsPage,
  WireOverview,
  WirePage,
  WireRequestsPage,
  WireTenantDetail,
  WireTenantRow,
  WireAdminWebhookEndpoint,
  WireWebhookDeliveriesPage,
  WireWebhookDelivery,
  WireWebhookEndpoint,
  WireWebhookEndpointParams,
  WireWebhookSecret
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
/** The request log and the webhook deliveries load their newest 1,000 rows. */
const REQUEST_PAGES = 5;

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

const toApiKey = (k: WireApiKey): ApiKey => ({
  id: k.id,
  label: k.label,
  state: k.state,
  dateCreated: k.dateCreated,
  lastUsedAt: k.lastUsedAt,
  revokedAt: k.revokedAt
});

const toReseller = (r: WireReseller): Reseller => ({
  id: r.id,
  name: r.name,
  maxProducts: r.maxProducts,
  maxTenants: r.maxTenants,
  wholesalePercent: r.wholesalePercent,
  billingEmail: r.billingEmail,
  brandName: r.brandName,
  brandUrl: r.brandUrl,
  listPriceCents: { small: r.listPriceCents.small, medium: r.listPriceCents.medium, large: r.listPriceCents.large },
  products: r.products.map(({ id, name, tenantCount }) => ({ id, name, tenantCount })),
  tenantCount: r.tenantCount,
  liveTenantCount: r.liveTenantCount,
  dateCreated: r.dateCreated
});

const toNewApiKey = (k: WireNewApiKey): NewApiKey => ({ ...toApiKey(k), secret: k.secret });

const toInvitation = ({ id, email, role, expiresAt, dateCreated, acceptUrl }: WireInvitation) => ({ id, email, role, expiresAt, dateCreated, acceptUrl });

type TenantName = { name: string; productId: string; productName: string };

/**
 * How to reach the API: the admin token on /admin for a platform admin, or a customer's session
 * on /account, where the API answers the same routes narrowed to their storefront.
 */
export type ApiAccess = { prefix: "/admin" | "/account"; headers: Record<string, string> };

/** Calls the admin endpoints (or their /account twins). Responses are never cached. */
export class HttpAdminApi implements AdminApi {
  readonly isFixture = false;
  private tenantIndex?: Promise<Map<string, TenantName>>;
  private overviewBody?: Promise<WireOverview>;

  constructor(
    private readonly baseUrl: string,
    private readonly access: () => Promise<ApiAccess>
  ) {}

  /** The request's URL and headers; paths below are written as /admin/… */
  private async target(path: string): Promise<{ url: URL; headers: Record<string, string> }> {
    const { prefix, headers } = await this.access();
    return { url: new URL(prefix + path.replace(/^\/admin/, ""), this.baseUrl), headers };
  }

  private async get<T>(path: string, { allow404 = false } = {}): Promise<T | null> {
    const { url, headers } = await this.target(path);
    const response = await fetch(url, {
      headers: { ...headers, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000)
    });
    if (allow404 && response.status === 404) return null;
    if (!response.ok) throw new AdminApiError(response.status, path, await apiMessage(response));
    return (await response.json()) as T;
  }

  /** A change. Returns the JSON body, or null for the API's bodiless 200s. */
  private async send<T>(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T | null> {
    const { url, headers } = await this.target(path);
    const response = await fetch(url, {
      method,
      headers: {
        ...headers,
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
      productionVersionId: p.productionVersionId,
      resellerId: p.resellerId ?? null,
      resellerName: p.resellerName ?? null
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

  async mailDomain(tenantId: string): Promise<MailDomain | null> {
    const res = await this.get<{ mailDomain: MailDomain | null }>(`/admin/tenants/${encodeURIComponent(tenantId)}/mail-domain`, {
      allow404: true
    });
    return res?.mailDomain ?? null;
  }

  async moveSiteIn(productId: string, input: { name: string; size: StoreSize }): Promise<ImportCode> {
    return (await this.send<ImportCode>("POST", this.productPath(productId, "/imports"), input))!;
  }

  async createStore(productId: string, input: { name: string; size: StoreSize }): Promise<{ tenantId: string }> {
    const made = (await this.send<{ tenantId: string }>("POST", this.productPath(productId, "/tenants"), input))!;
    return { tenantId: made.tenantId };
  }

  async renewImportCode(tenantId: string): Promise<ImportCode> {
    return (await this.send<ImportCode>("POST", `/admin/tenants/${encodeURIComponent(tenantId)}/import-code`))!;
  }

  async restoreBackup(tenantId: string, backupId: string, takeBackup: boolean): Promise<void> {
    await this.send("POST", `/admin/tenants/${encodeURIComponent(tenantId)}/restore`, { backupId, takeBackup });
  }

  async setMailDomain(tenantId: string, domainName: string): Promise<MailDomain> {
    const res = await this.send<{ mailDomain: MailDomain }>("PUT", `/admin/tenants/${encodeURIComponent(tenantId)}/mail-domain`, {
      domainName
    });
    return res!.mailDomain;
  }

  async removeMailDomain(tenantId: string): Promise<void> {
    await this.send("DELETE", `/admin/tenants/${encodeURIComponent(tenantId)}/mail-domain`);
  }

  async domainConnect(tenantId: string, domainName: string, service: "website" | "email"): Promise<DomainConnectLink> {
    const query = new URLSearchParams({ domainName, service });
    return (await this.get<DomainConnectLink>(`/admin/tenants/${encodeURIComponent(tenantId)}/domain-connect?${query}`))!;
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

  async webhooks(productId?: string): Promise<WebhookEndpoint[]> {
    return (await this.get<WireAdminWebhookEndpoint[]>(withQuery("/admin/webhooks", { productId })))!;
  }

  async webhookDeliveries(filter: WebhookFilter = {}): Promise<Listing<WebhookDelivery>> {
    const { items, total } = await this.getAll<WireWebhookDeliveriesPage["items"][number]>(
      "/admin/webhooks/deliveries",
      { productId: filter.productId, endpointId: filter.endpointId, status: filter.status, tenantId: filter.tenantId },
      REQUEST_PAGES
    );
    return { items, total };
  }

  private webhookPath(id: string, rest = ""): string {
    return `/admin/webhooks/${encodeURIComponent(id)}${rest}`;
  }

  async createWebhook(productId: string, input: WebhookEndpointInput): Promise<WebhookSecret> {
    const body: WireWebhookEndpointParams = { productId, ...input };
    return (await this.send<WireWebhookSecret>("POST", "/admin/webhooks", body))!;
  }

  async updateWebhook(id: string, change: WebhookEndpointChange): Promise<void> {
    const body: WireWebhookEndpointParams = change;
    await this.send<WireWebhookEndpoint>("PUT", this.webhookPath(id), body);
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.send<WireWebhookEndpoint>("DELETE", this.webhookPath(id));
  }

  async rotateWebhookSecret(id: string): Promise<string> {
    return (await this.send<WireWebhookSecret>("POST", this.webhookPath(id, "/rotate-secret")))!.secret;
  }

  async testWebhook(id: string): Promise<void> {
    await this.send<WireWebhookDelivery>("POST", this.webhookPath(id, "/test"));
  }

  async retryWebhookDelivery(id: string): Promise<void> {
    await this.send<WireWebhookDelivery>("POST", `/admin/webhooks/deliveries/${encodeURIComponent(id)}/retry`);
  }

  async apiKeys(productId: string): Promise<ApiKey[]> {
    return (await this.get<WireApiKey[]>(this.productPath(productId, "/keys")))!.map(toApiKey);
  }

  async createAgency(input: NewAgencyInput): Promise<NewAgency> {
    const created = (await this.send<WireCreatedProduct>("POST", "/admin/products", input))!;
    return { productId: created.product.id, name: created.product.name, key: toNewApiKey(created.key) };
  }

  async storefront(productId: string): Promise<ReadyStorefront | null> {
    // 404 from an API without ready-made storefronts: none.
    const storefront = await this.get<WireStorefront | null>(this.productPath(productId, "/storefront"), { allow404: true });
    return storefront ? toStorefront(storefront) : null;
  }

  async createStorefront(productId: string, input: NewStorefrontInput): Promise<ReadyStorefront> {
    return toStorefront((await this.send<WireStorefront>("POST", this.productPath(productId, "/storefront"), input))!);
  }

  async createApiKey(productId: string, label: string | null): Promise<NewApiKey> {
    return toNewApiKey((await this.send<WireNewApiKey>("POST", this.productPath(productId, "/keys"), { label }))!);
  }

  async rotateApiKey(productId: string, keyId: string, graceHours: number): Promise<NewApiKey> {
    const path = this.productPath(productId, `/keys/${encodeURIComponent(keyId)}/rotate`);
    return toNewApiKey((await this.send<WireRotatedApiKey>("POST", path, { graceHours }))!.key);
  }

  async revokeApiKey(productId: string, keyId: string): Promise<void> {
    await this.send("DELETE", this.productPath(productId, `/keys/${encodeURIComponent(keyId)}`));
  }

  async applications(status?: ApplicationStatus): Promise<SellerApplication[]> {
    return (await this.get<SellerApplication[]>(`/admin/applications${status ? `?status=${status}` : ""}`))!;
  }

  async application(id: string): Promise<SellerApplication | null> {
    return this.get<SellerApplication>(`/admin/applications/${encodeURIComponent(id)}`, { allow404: true });
  }

  async approveApplication(id: string, input: { maxTenants: number | null; storefront: boolean }): Promise<ApprovedApplication> {
    const approved = (await this.send<WireApprovedApplication>("POST", `/admin/applications/${encodeURIComponent(id)}/approve`, input))!;
    return {
      productId: approved.productId,
      invitation: { acceptUrl: approved.invitation.acceptUrl, emailed: approved.invitation.emailed },
      ...(approved.storefront ? { storefront: toStorefront(approved.storefront) } : {}),
      ...(approved.storefrontError ? { storefrontError: approved.storefrontError } : {})
    };
  }

  async declineApplication(id: string): Promise<void> {
    await this.send("POST", `/admin/applications/${encodeURIComponent(id)}/decline`);
  }

  private resellerPath(id: string, rest = ""): string {
    return `/admin/resellers/${encodeURIComponent(id)}${rest}`;
  }

  async clients(): Promise<Client[]> {
    return (await this.get<Client[]>("/admin/clients"))!;
  }

  async createClient(input: { name: string; email: string; size: StoreSize }): Promise<Client> {
    return (await this.send<Client>("POST", "/admin/clients", input))!;
  }

  async resellers(): Promise<Reseller[]> {
    return (await this.get<WireReseller[]>("/admin/resellers"))!.map(toReseller);
  }

  async reseller(id: string): Promise<Reseller | null> {
    const reseller = await this.get<WireReseller>(this.resellerPath(id), { allow404: true });
    return reseller && toReseller(reseller);
  }

  async resellerUsage(id: string, from: string, to: string): Promise<ResellerUsage> {
    const query = new URLSearchParams({ from, to });
    const usage = (await this.get<ResellerUsage>(this.resellerPath(id, `/usage?${query}`)))!;
    return { from: usage.from, to: usage.to, storeDays: usage.storeDays, products: usage.products };
  }

  async resellerBill(id: string, month: string): Promise<ResellerBill> {
    const bill = (await this.get<ResellerBill>(this.resellerPath(id, `/bill?month=${encodeURIComponent(month)}`)))!;
    return {
      month: bill.month,
      complete: bill.complete,
      wholesalePercent: bill.wholesalePercent,
      billingEmail: bill.billingEmail,
      lines: bill.lines.map((l) => ({ ...l })),
      totalCents: bill.totalCents
    };
  }

  async createReseller(input: ResellerSettings & { productIds: string[] }): Promise<Reseller> {
    return toReseller((await this.send<WireReseller>("POST", "/admin/resellers", input))!);
  }

  async updateReseller(id: string, settings: Partial<ResellerSettings>): Promise<Reseller> {
    return toReseller((await this.send<WireReseller>("PUT", this.resellerPath(id), settings))!);
  }

  async deleteReseller(id: string): Promise<void> {
    await this.send("DELETE", this.resellerPath(id));
  }

  async addResellerProduct(id: string, productId: string): Promise<void> {
    await this.send("PUT", this.resellerPath(id, `/products/${encodeURIComponent(productId)}`));
  }

  async removeResellerProduct(id: string, productId: string): Promise<void> {
    await this.send("DELETE", this.resellerPath(id, `/products/${encodeURIComponent(productId)}`));
  }

  async team(productId: string): Promise<Team> {
    const view = (await this.get<WireOrganizationView>(this.productPath(productId, "/organization")))!;
    return {
      organization: view.organization && { id: view.organization.id, name: view.organization.name },
      members: view.members,
      invitations: view.invitations.map(toInvitation)
    };
  }

  async invite(productId: string, email: string, role: TeamRole): Promise<NewInvitation> {
    const created = (await this.send<WireInvitation>("POST", this.productPath(productId, "/invitations"), { email, role }))!;
    return { ...toInvitation(created), emailed: created.emailed === true };
  }

  async cancelInvitation(productId: string, invitationId: string): Promise<void> {
    await this.send("DELETE", this.productPath(productId, `/invitations/${encodeURIComponent(invitationId)}`));
  }

  async setMemberRole(productId: string, memberId: string, role: TeamRole): Promise<void> {
    await this.send("PATCH", this.productPath(productId, `/members/${encodeURIComponent(memberId)}`), { role });
  }

  async removeMember(productId: string, memberId: string): Promise<void> {
    await this.send("DELETE", this.productPath(productId, `/members/${encodeURIComponent(memberId)}`));
  }

  /** Every page of a list, up to maxPages. */
  private async getAll<T>(path: string, params: Query = {}, maxPages = MAX_PAGES): Promise<Listing<T> & { first: WirePage<T> }> {
    const first = (await this.get<WirePage<T>>(withQuery(path, { ...params, page: 1, pageSize: PAGE_SIZE })))!;
    const items = [...first.items];
    const pages = Math.min(Math.ceil(first.total / PAGE_SIZE), maxPages);
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

  async overview(productId?: string): Promise<Overview> {
    const o = productId
      ? (await this.get<WireOverview>(`/admin/overview?${new URLSearchParams({ productId })}`))!
      : await this.wireOverview();
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
      jobs,
      keepsOwnCode: t.keepsOwnCode ?? false,
      moveIn: t.moveIn ? { expiresAt: t.moveIn.expiresAt, startedAt: t.moveIn.startedAt, source: t.moveIn.source as MoveIn["source"] } : null
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

  async requests(filter: RequestFilter = {}): Promise<RequestLog> {
    // The log can hold a month of calls: the newest 1,000 that match is plenty to browse.
    const { items, total, first } = await this.getAll<WireRequestsPage["items"][number]>(
      "/admin/requests",
      { productId: filter.productId, tenantId: filter.tenantId, outcome: filter.outcome, from: filter.from },
      REQUEST_PAGES
    );
    const page = first as WireRequestsPage;
    // An older API sends no key labels or user ids.
    const rows = items.map((r) => ({ ...r, apiKeyLabel: r.apiKeyLabel ?? null, userId: r.userId ?? null }));
    return { items: rows, total, last24Hours: page.last24Hours, retentionDays: page.retentionDays };
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

function toStorefront(s: WireStorefront): ReadyStorefront {
  return { id: s.id, name: s.name, domain: s.domainName, statusCode: s.statusCode as StatusCode, statusName: s.statusName };
}
