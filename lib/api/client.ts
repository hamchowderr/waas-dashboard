import "server-only";

import { cache } from "react";

import type {
  Backup,
  Created,
  CreateTemplateInput,
  CreateVersionInput,
  ProductDetail,
  Template,
  Version,
  BackupFilter,
  JobFilter,
  JobsList,
  Listing,
  DomainConnectLink,
  MailDomain,
  Overview,
  RequestFilter,
  RequestLog,
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
  overview(): Promise<Overview>;
  tenants(filter?: TenantFilter): Promise<Listing<Tenant>>;
  /** Null when the tenant does not exist. */
  tenant(id: string): Promise<TenantDetail | null>;
  backups(filter?: BackupFilter): Promise<Listing<Backup>>;
  /** Queued, running and failed jobs (failed = used up its retries, not yet retried). */
  jobs(filter?: JobFilter): Promise<JobsList>;
  /** The newest API calls and admin changes, with counts for the last 24 hours. */
  requests(filter?: RequestFilter): Promise<RequestLog>;

  products(): Promise<ProductDetail[]>;
  versions(productId: string): Promise<Version[]>;
  templates(productId: string): Promise<Template[]>;

  // Changes. Each throws AdminApiError with the API's message when the API refuses.
  /** Re-queues a failed job; the store or version goes back to Pending. */
  retryFailure(failureId: string): Promise<void>;
  /** Makes a domain the store's main address, adding it if new; the old main domain redirects to it. */
  setMainDomain(tenantId: string, domainName: string): Promise<void>;
  /**
   * Rolls a live store back to one of its Done backups, in place. With takeBackup, what it holds
   * now is backed up first so the rollback can be undone.
   */
  restoreBackup(tenantId: string, backupId: string, takeBackup: boolean): Promise<void>;
  /** The store's own sending domain with its DNS records; null when it sends from the platform's address. */
  mailDomain(tenantId: string): Promise<MailDomain | null>;
  /** Gives the store its own sending domain; it is used once toSend has verified its DNS records. */
  setMailDomain(tenantId: string, domainName: string): Promise<MailDomain>;
  /** Moves the store back to the platform's address (within 10 minutes) and drops its domain. */
  removeMailDomain(tenantId: string): Promise<void>;
  /** A Domain Connect link for one of the store's domains (website) or its sending domain (email). */
  domainConnect(tenantId: string, domainName: string, service: "website" | "email"): Promise<DomainConnectLink>;
  createVersion(productId: string, input: CreateVersionInput): Promise<Created>;
  setProductionVersion(productId: string, versionId: string): Promise<void>;
  deleteVersion(productId: string, versionId: string): Promise<void>;
  createTemplate(productId: string, input: CreateTemplateInput): Promise<Created>;
  deleteTemplate(productId: string, templateId: string): Promise<void>;
}

/**
 * The live API when WAAS_API_URL and WAAS_ADMIN_TOKEN are set, sample data when
 * WAAS_API_FIXTURES=1. Anything else is a configuration error, so a missing variable
 * never silently shows sample data in production. One instance per request, so the
 * layout and the page share what they load.
 */
export const getAdminApi = cache((): AdminApi => {
  if (process.env.WAAS_API_FIXTURES === "1") return new FixtureAdminApi();
  const baseUrl = process.env.WAAS_API_URL;
  const token = process.env.WAAS_ADMIN_TOKEN;
  if (!baseUrl || !token) {
    throw new Error("Set WAAS_API_URL and WAAS_ADMIN_TOKEN, or WAAS_API_FIXTURES=1 for sample data.");
  }
  return new HttpAdminApi(baseUrl, token);
});
