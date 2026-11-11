import "server-only";

import { cache } from "react";

import type {
  HighLevelCheck,
  ApiKey,
  ApplicationStatus,
  BrandImage,
  BrandingFields,
  BrandingView,
  DashboardDomainView,
  ApprovedApplication,
  ApproveApplicationInput,
  SellerApplication,
  AddedStorefront,
  AddStorefrontInput,
  NewSeller,
  NewSellerInput,
  NewStorefrontInput,
  ReadyStorefront,
  NewApiKey,
  NewInvitation,
  TeamOf,
  Team,
  TeamRole,
  Backup,
  Created,
  CreateTemplateInput,
  CreateVersionInput,
  PluginChoice,
  PluginChoiceInput,
  PluginUpload,
  PluginSearch,
  ProspectSearch,
  ProspectCrm,
  ProspectCrmResult,
  ProspectAutomationInput,
  ProspectAutomations,
  ProspectMailbox,
  ProspectMailboxInput,
  CrmProspect,
  CrmTarget,
  ProspectUsage,
  ProductDetail,
  Reseller,
  ResellerBill,
  ResellerInvoice,
  ResellerInvoices,
  ResellerSettings,
  ResellerUsage,
  Setup,
  Template,
  Version,
  BackupFilter,
  JobFilter,
  JobsList,
  Listing,
  DomainConnectLink,
  BoughtDomain,
  SiteLanguages,
  TenantPlugins,
  DomainContact,
  DomainOffer,
  DomainSetup,
  ImportCode,
  StoreSize,
  MailDomain,
  NotificationList,
  PushSettings,
  PushSubscriptionInput,
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
  WebhookSecret,
  WordPressLogin,
  SiteDownload
} from "./types";
import { FixtureAdminApi } from "./fixtures";
import { fixtureScope, getViewer, sessionHeaders } from "@/auth";
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
  /**
   * Setup checklists: every storefront's and reseller's for the platform admin; a customer's own storefront,
   * or on a reseller's team the reseller and all its storefronts.
   */
  setup(): Promise<Setup>;
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

  /** The header bell: the newest notifications and how many `userId` hasn't seen (on /account, the session's own). */
  notifications(userId: string, limit?: number): Promise<NotificationList>;
  /** Marks `userId`'s bell read up to now. Members may do this too: it changes only their own bell. */
  readNotifications(userId: string): Promise<void>;
  /** Whether phone and computer alerts are on in the API, and its public push key. */
  pushSettings(): Promise<PushSettings>;
  /** Turns alerts on for one of `userId`'s devices. */
  savePushSubscription(userId: string, subscription: PushSubscriptionInput): Promise<void>;
  /** Turns alerts off for one of `userId`'s devices. */
  removePushSubscription(userId: string, endpoint: string): Promise<void>;

  // Changes. Each throws AdminApiError with the API's message when the API refuses.
  /** Re-queues a failed job; the store or version goes back to Pending. */
  retryFailure(failureId: string): Promise<void>;
  /** Takes a failed job off the list without running anything; for one with nothing left to retry. */
  dismissFailure(failureId: string): Promise<void>;
  /** Makes a domain the store's main address, adding it if new; the old main domain redirects to it. */
  setMainDomain(tenantId: string, domainName: string): Promise<void>;
  /**
   * Rolls a live store back to one of its Done backups, in place. With takeBackup, what it holds
   * now is backed up first so the rollback can be undone.
   */
  restoreBackup(tenantId: string, backupId: string, takeBackup: boolean): Promise<void>;
  /** Takes a store offline; with takeBackup it is backed up first. Platform admin only. */
  suspendStore(tenantId: string, takeBackup: boolean): Promise<void>;
  /** Brings a suspended store back online. Platform admin only. */
  resumeStore(tenantId: string): Promise<void>;
  /**
   * Ends the hold of a site moved in: its scheduled tasks start, it emails everyone and search engines
   * may index it. The store is Pending until that's done; one not on hold is left as it is.
   */
  goLive(tenantId: string): Promise<void>;
  /**
   * "Check now" for a HighLevel site: the site asks for its sub-account and token at once instead of within the
   * hour. Owners and admins only.
   */
  checkHighLevel(tenantId: string): Promise<HighLevelCheck>;
  /** A one-time link that opens the store's wp-admin signed in. Owners and admins only. */
  wordPressLogin(tenantId: string): Promise<WordPressLogin>;
  /** The store's newest copy to download from the last 7 days, or null. */
  siteDownload(tenantId: string): Promise<SiteDownload | null>;
  /** Starts a copy of the whole store to download, or gives the one being made or just made. */
  startSiteDownload(tenantId: string): Promise<SiteDownload>;
  /** The same for the product's ready-made storefront. */
  storefrontWordPressLogin(productId: string): Promise<WordPressLogin>;
  /**
   * Emails the store's owner that their website is ready, with a fresh link to set their password: the email
   * New site can send, sent later. `email` must be a WordPress user of the store. Owners and admins only.
   */
  notifyOwner(tenantId: string, email: string): Promise<void>;
  /** Deletes a store; its backups are kept for the retention period. Platform admin only. */
  deleteStore(tenantId: string): Promise<void>;
  /** Makes a store that waits for a site moved in from another host, and answers its import code. */
  moveSiteIn(productId: string, input: { name: string; size: StoreSize }): Promise<ImportCode>;
  /** A new store of the storefront, built from its production version and latest template. */
  createStore(productId: string, input: { name: string; ownerEmail: string; size: StoreSize; siteType: string; notifyOwner?: boolean }): Promise<{ tenantId: string }>;
  /** A new import code for a store still waiting for its site; the old one stops working. */
  renewImportCode(tenantId: string): Promise<ImportCode>;
  /**
   * Copies the store's old site in with Reprint, from `siteUrl`: for a store waiting for its site, one whose move
   * failed, or one on hold, which is copied again. The old site must have authorized the store's Migration Token.
   */
  copyWithReprint(tenantId: string, siteUrl: string): Promise<void>;
  /** The store's own sending domain with its DNS records; null when it sends from the platform's address. */
  mailDomain(tenantId: string): Promise<MailDomain | null>;
  /** Gives the store its own sending domain; it is used once toSend has verified its DNS records. */
  setMailDomain(tenantId: string, domainName: string): Promise<MailDomain>;
  /** Moves the store back to the platform's address (within 10 minutes) and drops its domain. */
  removeMailDomain(tenantId: string): Promise<void>;
  /** A Domain Connect link for one of the store's domains (website) or its sending domain (email). */
  domainConnect(tenantId: string, domainName: string, service: "website" | "email"): Promise<DomainConnectLink>;
  /** The DNS records a custom domain needs, whether it has them, and its one-click link; works before it is added. */
  domainSetup(tenantId: string, domainName: string): Promise<DomainSetup>;
  /** Domains to buy for a keyword or an exact name, with prices; 503 when buying is not set up on the API. */
  searchDomains(tenantId: string, query: string): Promise<DomainOffer[]>;
  /** Orders a domain for the store: the contact gets a Stripe invoice, and the domain is registered once it is paid. */
  buyDomain(tenantId: string, domainName: string, contact: DomainContact): Promise<BoughtDomain>;
  /** Domains bought for the store, newest first. */
  boughtDomains(tenantId: string): Promise<BoughtDomain[]>;
  /** What comes installed on the store and what each plugin is for; null when the store does not exist. */
  tenantPlugins(tenantId: string): Promise<TenantPlugins | null>;
  /** The store's languages, asked of the store itself; null when it can't say (not Done, older AnyPress Client). */
  tenantLanguages(tenantId: string): Promise<SiteLanguages | null>;
  setTenantLanguages(tenantId: string, on: boolean, languages?: string[]): Promise<SiteLanguages>;
  /** Turns a bought domain's yearly renewal on or off. */
  setDomainAutoRenew(tenantId: string, domainName: string, autoRenew: boolean): Promise<BoughtDomain>;
  /** The code that moves a bought domain to another registrar. */
  domainTransferCode(tenantId: string, domainName: string): Promise<string>;
  createVersion(productId: string, input: CreateVersionInput): Promise<Created>;
  setProductionVersion(productId: string, versionId: string): Promise<void>;
  deleteVersion(productId: string, versionId: string): Promise<void>;
  createTemplate(productId: string, input: CreateTemplateInput): Promise<Created>;
  deleteTemplate(productId: string, templateId: string): Promise<void>;
  /** The storefront's plugin choices and its reseller's, with the newest wordpress.org version of each added one. */
  pluginChoices(productId: string): Promise<PluginChoice[]>;
  /** The Sales Kit prospect finder's searches this month. */
  prospectUsage(productId: string): Promise<ProspectUsage>;
  /** Up to 20 local businesses of one kind in one place, from Google Places; counts one search. */
  searchProspects(productId: string, query: string, location: string, pageToken?: string): Promise<ProspectSearch>;
  /** Where prospects can go: the storefront's FluentCRM and the seller's HighLevel webhook. */
  prospectCrm(productId: string): Promise<ProspectCrm>;
  /** Sets (or, with null, removes) the HighLevel webhook prospects are posted to. */
  setProspectHighLevel(productId: string, webhook: string | null): Promise<ProspectCrm>;
  /** The seller's own mailbox for emails to prospects; never includes the password. */
  prospectMailbox(productId: string): Promise<ProspectMailbox>;
  /** Saves the mailbox (the storefront then signs in to it) or, with null, removes it. */
  setProspectMailbox(productId: string, mailbox: ProspectMailboxInput | null): Promise<ProspectMailbox>;
  /** The group outreach plans added to the storefront's FluentCRM as draft automations. */
  prospectAutomations(productId: string): Promise<ProspectAutomations>;
  /** Adds a group's outreach emails to the storefront's FluentCRM as a draft automation; one already there is kept. */
  addProspectAutomation(productId: string, input: ProspectAutomationInput): Promise<ProspectAutomations>;
  /** Sends businesses into FluentCRM, HighLevel or both; each goes to each CRM once. */
  addProspectsToCrm(productId: string, prospects: CrmProspect[], group: string | null, targets: CrmTarget[]): Promise<ProspectCrmResult>;
  /** The wordpress.org plugin directory's search, 24 a page. */
  searchPlugins(productId: string, query: string, page: number): Promise<PluginSearch>;
  /** Adds a plugin (pinned to version, or the newest) or switches a template plugin off; replaces an earlier choice. */
  setPluginChoice(productId: string, slug: string, input: PluginChoiceInput): Promise<void>;
  removePluginChoice(productId: string, slug: string): Promise<void>;
  /** Starts uploading a premium plugin's zip: PUT it to uploadUrl, then check it. */
  createPluginUpload(productId: string): Promise<Created>;
  /** Checks an uploaded zip: ready to add, or rejected with the reason. */
  checkPluginUpload(productId: string, uploadId: string): Promise<PluginUpload>;
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
  /** A new seller: its storefront and first key. */
  createSeller(input: NewSellerInput): Promise<NewSeller>;
  /** Renames a storefront. Platform admin only. */
  renameStorefront(productId: string, name: string): Promise<void>;
  /** Sets the most stores a storefront may have; null is no limit. Lowering it deletes nothing. Platform admin only. */
  setStoreLimit(productId: string, maxTenants: number | null): Promise<void>;
  setHighLevelAgency(productId: string, on: boolean): Promise<void>;
  /** Turns the clean wp-admin Dashboard home on or off on a storefront's stores. Its seller or reseller may too. */
  setCleanDashboard(productId: string, on: boolean): Promise<void>;
  /** Deletes a storefront with no stores and no ready-made storefront, with its keys. Platform admin only. */
  deleteStorefront(productId: string): Promise<void>;
  /** The product's ready-made storefront, or null. */
  storefront(productId: string): Promise<ReadyStorefront | null>;
  /** Builds the product's ready-made storefront, connected with a new key of the product. Platform admin only. */
  createStorefront(productId: string, input: NewStorefrontInput): Promise<ReadyStorefront>;
  createApiKey(productId: string, label: string | null): Promise<NewApiKey>;
  /** A new key with the same label; the old one keeps working for graceHours. */
  rotateApiKey(productId: string, keyId: string, graceHours: number): Promise<NewApiKey>;
  /** Stops a key now; the storefront's last key included. */
  revokeApiKey(productId: string, keyId: string): Promise<void>;
  /** Removes a key that already stopped working from the list for good. */
  removeApiKey(productId: string, keyId: string): Promise<void>;

  // Applications to sell, from the marketing site's form. Platform admin only.
  /** Newest first; every status when none is given. */
  applications(status?: ApplicationStatus): Promise<SellerApplication[]>;
  /** Null when there is no such application. */
  application(id: string): Promise<SellerApplication | null>;
  /** Makes the storefront with maxTenants stores, invites the applicant as owner and builds their ready-made storefront when asked. */
  approveApplication(id: string, input: ApproveApplicationInput): Promise<ApprovedApplication>;
  /** Declines and emails the applicant. */
  declineApplication(id: string): Promise<void>;

  // Reseller accounts: storefronts grouped under one partner. Platform admin only.
  resellers(): Promise<Reseller[]>;
  /** Null when there is no such reseller. */
  reseller(id: string): Promise<Reseller | null>;
  /** Store-days per size from `from` up to `to` (ISO dates). */
  resellerUsage(id: string, from: string, to: string): Promise<ResellerUsage>;
  /** The wholesale bill for one calendar month, YYYY-MM. */
  resellerBill(id: string, month: string): Promise<ResellerBill>;
  /** The Stripe invoices sent for its bills, newest month first. */
  resellerInvoices(id: string): Promise<ResellerInvoices>;
  /** Sends a month's bill as a Stripe invoice now, or tries a failed one again; never twice. */
  sendResellerInvoice(id: string, month: string): Promise<ResellerInvoice>;
  /** A new reseller, with those storefronts moved into it. */
  createReseller(input: ResellerSettings & { productIds: string[] }): Promise<Reseller>;
  /** Changes only the settings given. */
  updateReseller(id: string, settings: Partial<ResellerSettings>): Promise<Reseller>;
  /** Only a reseller with no storefronts. */
  deleteReseller(id: string): Promise<void>;
  addResellerProduct(id: string, productId: string): Promise<void>;
  /** A new storefront made inside the reseller, within its storefront limit. The platform admin or the reseller's team. */
  createResellerProduct(id: string, input: AddStorefrontInput): Promise<AddedStorefront>;
  removeResellerProduct(id: string, productId: string): Promise<void>;
  /** Partner keys: the reseller's own API keys, which work on every storefront it has. */
  partnerKeys(id: string): Promise<ApiKey[]>;
  createPartnerKey(id: string, label: string | null): Promise<NewApiKey>;
  /** The new key; the old one keeps working for graceHours. */
  rotatePartnerKey(id: string, keyId: string, graceHours: number): Promise<NewApiKey>;
  revokePartnerKey(id: string, keyId: string): Promise<void>;
  removePartnerKey(id: string, keyId: string): Promise<void>;

  // Teams: who can sign in to a storefront, or to all of a reseller's. The API emails invitations and
  // enforces who may change what.
  team(of: TeamOf): Promise<Team>;
  invite(of: TeamOf, email: string, role: TeamRole): Promise<NewInvitation>;
  cancelInvitation(of: TeamOf, invitationId: string): Promise<void>;
  setMemberRole(of: TeamOf, memberId: string, role: TeamRole): Promise<void>;
  removeMember(of: TeamOf, memberId: string): Promise<void>;

  // Branding: a storefront's or reseller's own look in the dashboard. A reseller's is the platform admin's.
  branding(of: TeamOf): Promise<BrandingView>;
  /** Sets name, color and support email; null clears one. */
  updateBranding(of: TeamOf, fields: BrandingFields): Promise<BrandingView>;
  /** The image's bytes; the API reads the type from them and refuses SVG. */
  uploadBrandImage(of: TeamOf, kind: BrandImage, image: Uint8Array): Promise<BrandingView>;
  removeBrandImage(of: TeamOf, kind: BrandImage): Promise<BrandingView>;

  // A storefront's own dashboard address, like dashboard.theirbusiness.com.
  dashboardDomain(productId: string): Promise<DashboardDomainView>;
  /** Replaces the address before; the answer lists the DNS records to add. */
  setDashboardDomain(productId: string, domain: string): Promise<DashboardDomainView>;
  /** Asks the host to look at the DNS again. */
  checkDashboardDomain(productId: string): Promise<DashboardDomainView>;
  removeDashboardDomain(productId: string): Promise<DashboardDomainView>;
}

/**
 * The live API when WAAS_API_URL is set, sample data when WAAS_API_FIXTURES=1. Anything else is
 * a configuration error, so a missing variable never silently shows sample data in production.
 * A platform admin reaches /admin with WAAS_ADMIN_TOKEN; a signed-in customer reaches /account
 * with their session, and the API shows them their storefront only. One instance per request,
 * so the layout and the page share what they load.
 */
export const getAdminApi = cache((): AdminApi => {
  if (process.env.WAAS_API_FIXTURES === "1") return new FixtureAdminApi(fixtureScope());
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
  return { prefix: "/account", headers: { ...(await sessionHeaders(viewer.cookie)), "X-Session-Auth": "1" } };
}
