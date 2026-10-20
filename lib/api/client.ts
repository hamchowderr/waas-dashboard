import "server-only";

import { cache } from "react";

import type {
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
  TenantFilter,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEndpointChange,
  WebhookEndpointInput,
  WebhookFilter,
  WebhookSecret
} from "./types";
import { FixtureAdminApi } from "./fixtures";
import { getViewer } from "@/auth";
import { AdminApiError, HttpAdminApi, type ApiAccess } from "./http";

/** Read-only view of the provisioning API's admin endpoints. Server code only. */
export interface AdminApi {
  /** True when the data is sample data, not the live API. */
  readonly isFixture: boolean;
  /** Counts for one storefront when given; `products` always lists every storefront. */
  overview(productId?: string): Promise<Overview>;
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
  /** Every storefront's webhook endpoints (or one storefront's), with their last 24 hours. Never secrets. */
  webhooks(productId?: string): Promise<WebhookEndpoint[]>;
  /** The newest webhook deliveries, newest first. */
  webhookDeliveries(filter?: WebhookFilter): Promise<Listing<WebhookDelivery>>;

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
  /** Adds an endpoint to a storefront. The secret is in the result and is never shown again. */
  createWebhook(productId: string, input: WebhookEndpointInput): Promise<WebhookSecret>;
  /** Turns an endpoint off or on, or changes its address, description or events. */
  updateWebhook(id: string, change: WebhookEndpointChange): Promise<void>;
  deleteWebhook(id: string): Promise<void>;
  /** A new signing secret; the old one stops working at once. Returns the new secret. */
  rotateWebhookSecret(id: string): Promise<string>;
  /** Sends a webhook.test event to the endpoint, even when it is off. */
  testWebhook(id: string): Promise<void>;
  /** Sends a delivered or failed delivery again, retries included. The API refuses a pending one. */
  retryWebhookDelivery(id: string): Promise<void>;

  // API keys. A secret comes back only from the call that creates the key; nothing keeps it.
  /** A storefront's working keys and those revoked in the last 30 days, newest first. */
  apiKeys(productId: string): Promise<ApiKey[]>;
  /** A new storefront for an agency, with its first key. */
  createAgency(input: NewAgencyInput): Promise<NewAgency>;
  /** The product's ready-made storefront, or null. */
  storefront(productId: string): Promise<ReadyStorefront | null>;
  /** Builds the product's ready-made storefront, connected with a new key of the product. Platform admin only. */
  createStorefront(productId: string, input: NewStorefrontInput): Promise<ReadyStorefront>;
  createApiKey(productId: string, label: string | null): Promise<NewApiKey>;
  /** A new key with the same label; the old one keeps working for graceHours. */
  rotateApiKey(productId: string, keyId: string, graceHours: number): Promise<NewApiKey>;
  /** Stops a key now; the storefront's last key included. */
  revokeApiKey(productId: string, keyId: string): Promise<void>;

  // Applications to sell, from the marketing site's form. Platform admin only.
  /** Newest first; every status when none is given. */
  applications(status?: ApplicationStatus): Promise<SellerApplication[]>;
  /** Null when there is no such application. */
  application(id: string): Promise<SellerApplication | null>;
  /** Makes the storefront with maxTenants stores, invites the applicant as owner and builds their ready-made storefront when asked. */
  approveApplication(id: string, input: { maxTenants: number | null; storefront: boolean }): Promise<ApprovedApplication>;
  /** Declines and emails the applicant. */
  declineApplication(id: string): Promise<void>;

  // Teams: who can sign in to a storefront. The API emails invitations and enforces who may change what.
  team(productId: string): Promise<Team>;
  invite(productId: string, email: string, role: TeamRole): Promise<NewInvitation>;
  cancelInvitation(productId: string, invitationId: string): Promise<void>;
  setMemberRole(productId: string, memberId: string, role: TeamRole): Promise<void>;
  removeMember(productId: string, memberId: string): Promise<void>;
}

/**
 * The live API when WAAS_API_URL is set, sample data when WAAS_API_FIXTURES=1. Anything else is
 * a configuration error, so a missing variable never silently shows sample data in production.
 * A platform admin reaches /admin with WAAS_ADMIN_TOKEN; a signed-in customer reaches /account
 * with their session, and the API shows them their storefront only. One instance per request,
 * so the layout and the page share what they load.
 */
export const getAdminApi = cache((): AdminApi => {
  if (process.env.WAAS_API_FIXTURES === "1") return new FixtureAdminApi();
  const baseUrl = process.env.WAAS_API_URL;
  if (!baseUrl) throw new Error("Set WAAS_API_URL, or WAAS_API_FIXTURES=1 for sample data.");
  return new HttpAdminApi(baseUrl, access);
});

async function access(): Promise<ApiAccess> {
  const viewer = await getViewer();
  if (!viewer) throw new AdminApiError(403, "/account", "You are signed out. Sign in again.");
  if (viewer.isAdmin) {
    const token = process.env.WAAS_ADMIN_TOKEN;
    if (!token) throw new Error("Set WAAS_ADMIN_TOKEN so platform admins can see every storefront.");
    return { prefix: "/admin", headers: { Authorization: `Bearer ${token}` } };
  }
  return { prefix: "/account", headers: { Cookie: viewer.cookie, "X-Session-Auth": "1" } };
}
