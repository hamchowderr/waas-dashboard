import "server-only";

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
import { FixtureAdminApi } from "./fixtures";
import { HttpAdminApi } from "./http";

/** Read-only view of the provisioning API's admin endpoints. Server code only. */
export interface AdminApi {
  /** True when the data is sample data, not the live API. */
  readonly isFixture: boolean;
  health(): Promise<Health>;
  overview(): Promise<Overview>;
  tenants(filter?: TenantFilter): Promise<Page<Tenant>>;
  /** Null when the tenant does not exist. */
  tenant(id: string): Promise<TenantDetail | null>;
  backups(filter?: BackupFilter): Promise<Page<Backup>>;
  jobs(filter?: JobFilter): Promise<JobsPage>;
}

/**
 * The live API when WAAS_API_URL and WAAS_ADMIN_TOKEN are set, sample data when
 * WAAS_API_FIXTURES=1. Anything else is a configuration error, so a missing variable
 * never silently shows sample data in production.
 */
export function getAdminApi(): AdminApi {
  if (process.env.WAAS_API_FIXTURES === "1") return new FixtureAdminApi();
  const baseUrl = process.env.WAAS_API_URL;
  const token = process.env.WAAS_ADMIN_TOKEN;
  if (!baseUrl || !token) {
    throw new Error("Set WAAS_API_URL and WAAS_ADMIN_TOKEN, or WAAS_API_FIXTURES=1 for sample data.");
  }
  return new HttpAdminApi(baseUrl, token);
}
