import "server-only";

import type { AdminApi } from "./client";
import type {
  Backup,
  BackupFilter,
  Health,
  JobFilter,
  JobsPage,
  Overview,
  Page,
  Tenant,
  TenantDetail,
  TenantFilter
} from "./types";

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string
  ) {
    super(`Provisioning API returned ${status} for ${path}`);
  }
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

/** Calls the admin endpoints with the admin token. Responses are never cached. */
export class HttpAdminApi implements AdminApi {
  readonly isFixture = false;

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
    if (!response.ok) throw new AdminApiError(response.status, path);
    return (await response.json()) as T;
  }

  /** /health answers 503 with the same body when unhealthy; an unreachable API is down too. */
  async health(): Promise<Health> {
    try {
      const response = await fetch(new URL("/health", this.baseUrl), {
        cache: "no-store",
        signal: AbortSignal.timeout(5_000)
      });
      const body = (await response.json()) as Partial<Health>;
      const ok = response.ok && body.ok !== false;
      // An API without per-check detail (the bare {ok:true}) reports through `ok` alone.
      const fallback = ok ? "up" : "down";
      return {
        ok,
        checks: body.checks ?? { database: fallback, queue: fallback },
        checkedAt: body.checkedAt ?? new Date().toISOString()
      };
    } catch {
      return { ok: false, checks: { database: "down", queue: "down" }, checkedAt: new Date().toISOString() };
    }
  }

  async overview(): Promise<Overview> {
    return (await this.get<Overview>("/admin/overview"))!;
  }

  async tenants(filter: TenantFilter = {}): Promise<Page<Tenant>> {
    return (await this.get<Page<Tenant>>(`/admin/tenants${query(filter)}`))!;
  }

  async tenant(id: string): Promise<TenantDetail | null> {
    return this.get<TenantDetail>(`/admin/tenants/${encodeURIComponent(id)}`, { allow404: true });
  }

  async backups(filter: BackupFilter = {}): Promise<Page<Backup>> {
    return (await this.get<Page<Backup>>(`/admin/backups${query(filter)}`))!;
  }

  async jobs(filter: JobFilter = {}): Promise<JobsPage> {
    return (await this.get<JobsPage>(`/admin/jobs${query(filter)}`))!;
  }
}
