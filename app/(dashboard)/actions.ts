"use server";

import { revalidatePath } from "next/cache";

import { canChange, canUseDashboard, getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { AdminApiError } from "@/lib/api/http";
import type {
  BrandImage,
  BrandingFields,
  BrandingView,
  DashboardDomainView,
  Created,
  CreateTemplateInput,
  CreateVersionInput,
  PluginChoiceInput,
  PluginSearch,
  PluginUpload,
  ImportCode,
  MailDomain,
  StoreSize,
  ApprovedApplication,
  NewSeller,
  NewApiKey,
  NewInvitation,
  NewStorefrontInput,
  ReadyStorefront,
  Reseller,
  ResellerInvoice,
  ResellerSettings,
  TeamOf,
  TeamRole,
  WebhookEndpointChange,
  WebhookEndpointInput,
  WebhookEventType,
  WebhookSecret
} from "@/lib/api/types";
import { BRAND_IMAGE_LIMITS } from "@/lib/branding";
import { webhookEventLabels } from "@/lib/format";

// Every change the dashboard makes goes through these actions. Server actions can be
// called directly, not only from our pages, so each one checks the session itself. A customer's
// changes go to the API's /account routes, which only reach their own storefront.

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function run<T>(work: () => Promise<T>, revalidate: string[]): Promise<ActionResult<T>> {
  const viewer = await getViewer().catch(() => null);
  if (!canUseDashboard(viewer)) return { ok: false, error: "You are signed out. Sign in again." };
  if (!canChange(viewer)) return { ok: false, error: "You can view this storefront but not change it. Ask an owner or admin." };
  try {
    const data = await work();
    for (const path of revalidate) revalidatePath(path, "layout");
    return { ok: true, data };
  } catch (error) {
    if (error instanceof AdminApiError) return { ok: false, error: error.apiMessage ?? error.message };
    if (error instanceof InputError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "The provisioning API did not answer. Try again." };
  }
}

class InputError extends Error {}

function uuid(value: unknown, what: string): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new InputError(`Invalid ${what}`);
  return value;
}

function text(value: unknown, what: string, max = 200): string {
  if (typeof value !== "string" || !value.trim()) throw new InputError(`${what} is required`);
  if (value.length > max) throw new InputError(`${what} is too long`);
  return value.trim();
}

/** Retries failed jobs one by one; reports how many the API accepted. */
export async function retryFailures(
  failureIds: string[]
): Promise<ActionResult<{ retried: number; errors: string[] }>> {
  return run(async () => {
    if (!Array.isArray(failureIds) || failureIds.length === 0 || failureIds.length > 200)
      throw new InputError("Choose between 1 and 200 failed jobs");
    const ids = failureIds.map((id) => uuid(id, "job id"));
    const api = getAdminApi();
    const errors: string[] = [];
    let retried = 0;
    for (const id of ids) {
      try {
        await api.retryFailure(id);
        retried++;
      } catch (error) {
        if (!(error instanceof AdminApiError)) throw error;
        errors.push(error.apiMessage ?? error.message);
      }
    }
    return { retried, errors };
  }, ["/"]);
}

// A bare hostname, as the API stores it: letters, digits and hyphens, dot-separated.
const DOMAIN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;

/** Moves a store to a new main address; the old one keeps redirecting to it. */
export async function setMainDomain(tenantId: string, domainName: string): Promise<ActionResult> {
  return run(async () => {
    const domain = text(domainName, "Address", 253)
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    if (!DOMAIN.test(domain)) throw new InputError("Enter an address like shop.example.com");
    await getAdminApi().setMainDomain(uuid(tenantId, "store"), domain);
    return undefined;
  }, ["/stores", "/"]);
}

/** Gives a store its own sending domain; it sends from it once toSend has verified the DNS records. */
export async function setMailDomain(tenantId: string, domainName: string): Promise<ActionResult<MailDomain>> {
  return run(async () => {
    const domain = text(domainName, "Domain", 253)
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    if (!DOMAIN.test(domain)) throw new InputError("Enter a domain like shop.example.com");
    return getAdminApi().setMailDomain(uuid(tenantId, "store"), domain);
  }, ["/stores"]);
}

/** Moves a store back to sending from the platform's address. */
export async function removeMailDomain(tenantId: string): Promise<ActionResult> {
  return run(async () => {
    await getAdminApi().removeMailDomain(uuid(tenantId, "store"));
    return undefined;
  }, ["/stores"]);
}

const SIZES = ["small", "medium", "large"] as const;

/** Makes a store that waits for a site moved in from another host; answers the code for the AnyPress Export plugin. */
export async function moveSiteIn(productId: string, name: string, size: string): Promise<ActionResult<ImportCode>> {
  return run(async () => {
    if (!SIZES.includes(size as StoreSize)) throw new InputError("Invalid size");
    return getAdminApi().moveSiteIn(uuid(productId, "storefront"), { name: text(name, "Name", 30), size: size as StoreSize });
  }, ["/stores", "/"]);
}

/** A new store of the storefront, built from its production version and latest template. */
export async function createStore(productId: string, name: string, size: string): Promise<ActionResult<{ tenantId: string }>> {
  return run(async () => {
    if (!SIZES.includes(size as StoreSize)) throw new InputError("Invalid size");
    return getAdminApi().createStore(uuid(productId, "storefront"), { name: text(name, "Name", 30), size: size as StoreSize });
  }, ["/stores", "/"]);
}

/** Adds a client: their own storefront, a site once it has built, and an emailed invitation. Platform admin only. */
export async function addClient(name: string, email: string, size: string): Promise<ActionResult<{ productId: string }>> {
  return run(async () => {
    if (!SIZES.includes(size as StoreSize)) throw new InputError("Invalid size");
    const address = typeof email === "string" ? email.trim() : "";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) throw new InputError("Enter the client's email address");
    await adminOnly("add clients");
    const client = await getAdminApi().createClient({ name: text(name, "Name", 100), email: address, size: size as StoreSize });
    return { productId: client.productId };
  }, ["/clients", "/"]);
}

/** A new import code for a store still waiting for its site; the old one stops working. */
export async function renewImportCode(tenantId: string): Promise<ActionResult<ImportCode>> {
  return run(() => getAdminApi().renewImportCode(uuid(tenantId, "store")), ["/stores"]);
}

/** Rolls a live store back to one of its backups; with takeBackup, its current state is backed up first. */
export async function restoreBackup(tenantId: string, backupId: string, takeBackup: boolean): Promise<ActionResult> {
  return run(async () => {
    if (typeof takeBackup !== "boolean") throw new InputError("Invalid choice");
    await getAdminApi().restoreBackup(uuid(tenantId, "store"), uuid(backupId, "backup"), takeBackup);
    return undefined;
  }, ["/stores", "/backups", "/"]);
}

/** Takes a store offline, backing it up first unless takeBackup is false. Platform admin only. */
export async function suspendStore(tenantId: string, takeBackup: boolean): Promise<ActionResult> {
  return run(async () => {
    await adminOnly("suspend a store");
    if (typeof takeBackup !== "boolean") throw new InputError("Invalid choice");
    await getAdminApi().suspendStore(uuid(tenantId, "store"), takeBackup);
    return undefined;
  }, ["/stores", "/backups", "/"]);
}

/** Brings a suspended store back online. Platform admin only. */
export async function resumeStore(tenantId: string): Promise<ActionResult> {
  return run(async () => {
    await adminOnly("resume a store");
    await getAdminApi().resumeStore(uuid(tenantId, "store"));
    return undefined;
  }, ["/stores", "/"]);
}

/** Deletes a store; its backups are kept. Platform admin only. */
export async function deleteStore(tenantId: string): Promise<ActionResult> {
  return run(async () => {
    await adminOnly("delete a store");
    await getAdminApi().deleteStore(uuid(tenantId, "store"));
    return undefined;
  }, ["/stores", "/backups", "/"]);
}

export async function createVersion(productId: string, input: CreateVersionInput): Promise<ActionResult<Created>> {
  return run(async () => {
    const product = uuid(productId, "storefront");
    const useCustomUpload = input?.useCustomUpload === true;
    const body: CreateVersionInput = {
      name: text(input?.name, "Name", 30),
      wordPressVersion: text(input?.wordPressVersion, "WordPress version", 20),
      phpVersion: text(input?.phpVersion, "PHP version", 20),
      useCustomUpload,
      ...(useCustomUpload ? { asZip: input?.asZip === true } : { snapshotId: uuid(input?.snapshotId, "template") }),
      snapshotIdsToCopy: (Array.isArray(input?.snapshotIdsToCopy) ? input.snapshotIdsToCopy : []).map((id) =>
        uuid(id, "group template")
      )
    };
    return getAdminApi().createVersion(product, body);
  }, ["/versions"]);
}

export async function setProductionVersion(productId: string, versionId: string): Promise<ActionResult> {
  return run(async () => {
    await getAdminApi().setProductionVersion(uuid(productId, "storefront"), uuid(versionId, "version"));
    return undefined;
  }, ["/versions", "/"]);
}

export async function deleteVersion(productId: string, versionId: string): Promise<ActionResult> {
  return run(async () => {
    await getAdminApi().deleteVersion(uuid(productId, "storefront"), uuid(versionId, "version"));
    return undefined;
  }, ["/versions"]);
}

// Plugin choices: wordpress.org or uploaded premium plugins a storefront's stores get on top of its template, or template plugins it
// switches off. They reach stores with the next version.

const PLUGIN_SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/;
const SITE_TYPE = /^[A-Za-z0-9_-]{1,64}$/;
const LICENCE_NAME = /^[A-Z][A-Z0-9_]{2,63}$/;

/** Licence constants as the API takes them: up to 10, upper-case names, values up to 500 characters. */
function licenceInput(licence: unknown): Record<string, string> | null | undefined {
  if (licence === undefined || licence === null) return licence;
  if (typeof licence !== "object" || Array.isArray(licence)) throw new InputError("Invalid licence keys");
  const entries = Object.entries(licence as Record<string, unknown>);
  if (entries.length > 10) throw new InputError("At most 10 licence keys");
  for (const [name, value] of entries) {
    if (!LICENCE_NAME.test(name)) throw new InputError(`${name || "A licence key name"} must be upper-case letters, digits and underscores, like GF_LICENSE_KEY`);
    if (typeof value !== "string" || !value.trim() || value.length > 500) throw new InputError(`Enter the value of ${name} (up to 500 characters)`);
  }
  return entries.length ? Object.fromEntries(entries.map(([name, value]) => [name, (value as string).trim()])) : null;
}

/** The wordpress.org directory's search. Members may search too: it changes nothing. */
export async function searchPlugins(productId: string, query: string, page = 1): Promise<ActionResult<PluginSearch>> {
  const viewer = await getViewer().catch(() => null);
  if (!canUseDashboard(viewer)) return { ok: false, error: "You are signed out. Sign in again." };
  try {
    const q = text(query, "Search", 100);
    if (q.length < 2) throw new InputError("Type at least 2 letters");
    const n = Number.isInteger(page) && page >= 1 && page <= 50 ? page : 1;
    return { ok: true, data: await getAdminApi().searchPlugins(uuid(productId, "storefront"), q, n) };
  } catch (error) {
    if (error instanceof AdminApiError) return { ok: false, error: error.apiMessage ?? error.message };
    if (error instanceof InputError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "The provisioning API did not answer. Try again." };
  }
}

export async function setPluginChoice(productId: string, slug: string, input: PluginChoiceInput): Promise<ActionResult> {
  return run(async () => {
    if (typeof slug !== "string" || !PLUGIN_SLUG.test(slug)) throw new InputError("Invalid plugin");
    const action = input?.action === "off" ? "off" : "add";
    const siteTypes = Array.isArray(input?.siteTypes) ? input.siteTypes : [];
    if (siteTypes.length > 20 || !siteTypes.every((t) => typeof t === "string" && SITE_TYPE.test(t))) throw new InputError("Invalid site types");
    const version = action === "add" && typeof input?.version === "string" && input.version ? text(input.version, "Version", 32) : undefined;
    const uploadId = action === "add" && typeof input?.uploadId === "string" && UUID.test(input.uploadId) ? input.uploadId : undefined;
    const licence = action === "add" ? licenceInput(input?.licence) : undefined;
    await getAdminApi().setPluginChoice(uuid(productId, "storefront"), slug, {
      action,
      siteTypes: [...new Set(siteTypes)],
      ...(version && !uploadId && { version }),
      ...(uploadId && { uploadId }),
      ...(licence !== undefined && { licence })
    });
    return undefined;
  }, ["/plugins"]);
}

/** Starts a premium plugin upload; the browser PUTs the zip to uploadUrl, then checks it. */
export async function startPluginUpload(productId: string): Promise<ActionResult<Created>> {
  return run(async () => getAdminApi().createPluginUpload(uuid(productId, "storefront")), []);
}

export async function checkPluginUpload(productId: string, uploadId: string): Promise<ActionResult<PluginUpload>> {
  return run(async () => getAdminApi().checkPluginUpload(uuid(productId, "storefront"), uuid(uploadId, "upload")), []);
}

export async function removePluginChoice(productId: string, slug: string): Promise<ActionResult> {
  return run(async () => {
    if (typeof slug !== "string" || !PLUGIN_SLUG.test(slug)) throw new InputError("Invalid plugin");
    await getAdminApi().removePluginChoice(uuid(productId, "storefront"), slug);
    return undefined;
  }, ["/plugins"]);
}

export async function createTemplate(productId: string, input: CreateTemplateInput): Promise<ActionResult<Created>> {
  return run(async () => {
    const isTenantSnapshot = input?.isTenantSnapshot === true;
    const body: CreateTemplateInput = {
      name: text(input?.name, "Name", 50),
      comment: text(input?.comment, "Description", 500),
      isTenantSnapshot,
      showInConsole: input?.showInConsole === true,
      ...(isTenantSnapshot ? { groupName: text(input?.groupName, "Group name", 50) } : {})
    };
    return getAdminApi().createTemplate(uuid(productId, "storefront"), body);
  }, ["/versions"]);
}

export async function deleteTemplate(productId: string, templateId: string): Promise<ActionResult> {
  return run(async () => {
    await getAdminApi().deleteTemplate(uuid(productId, "storefront"), uuid(templateId, "template"));
    return undefined;
  }, ["/versions"]);
}

// Webhooks. The API checks the address properly (https, public); these catch typos first.

function webhookUrl(value: unknown): string {
  const url = text(value, "URL", 2000);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new InputError("Enter a URL like https://example.com/webhooks");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new InputError("The URL must start with https://");
  return url;
}

function webhookDescription(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new InputError("Invalid description");
  if (value.length > 200) throw new InputError("Description is too long");
  return value.trim() || null;
}

function webhookEvents(value: unknown): WebhookEventType[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 50) throw new InputError("Invalid events");
  return value.map((type) => {
    if (typeof type !== "string" || !Object.hasOwn(webhookEventLabels, type)) throw new InputError("Unknown event");
    return type as WebhookEventType;
  });
}

/** Adds a webhook endpoint to a storefront; the result holds its secret, shown once. */
export async function createWebhook(productId: string, input: WebhookEndpointInput): Promise<ActionResult<WebhookSecret>> {
  return run(async () => {
    const body: WebhookEndpointInput = {
      url: webhookUrl(input?.url),
      description: webhookDescription(input?.description),
      eventTypes: webhookEvents(input?.eventTypes)
    };
    return getAdminApi().createWebhook(uuid(productId, "storefront"), body);
  }, ["/webhooks"]);
}

/** Turns an endpoint off or on, or changes its address, description or events. */
export async function updateWebhook(id: string, change: WebhookEndpointChange): Promise<ActionResult> {
  return run(async () => {
    if (change?.enabled !== undefined && typeof change.enabled !== "boolean") throw new InputError("Invalid choice");
    const body: WebhookEndpointChange = {
      ...(change?.url !== undefined ? { url: webhookUrl(change.url) } : {}),
      ...(change?.description !== undefined ? { description: webhookDescription(change.description) } : {}),
      ...(change?.eventTypes !== undefined ? { eventTypes: webhookEvents(change.eventTypes) } : {}),
      ...(change?.enabled !== undefined ? { enabled: change.enabled } : {})
    };
    await getAdminApi().updateWebhook(uuid(id, "endpoint"), body);
    return undefined;
  }, ["/webhooks"]);
}

export async function deleteWebhook(id: string): Promise<ActionResult> {
  return run(async () => {
    await getAdminApi().deleteWebhook(uuid(id, "endpoint"));
    return undefined;
  }, ["/webhooks"]);
}

/** Replaces an endpoint's signing secret; returns the new one, shown once. */
export async function rotateWebhookSecret(id: string): Promise<ActionResult<string>> {
  return run(() => getAdminApi().rotateWebhookSecret(uuid(id, "endpoint")), ["/webhooks"]);
}

export async function testWebhook(id: string): Promise<ActionResult> {
  return run(async () => {
    await getAdminApi().testWebhook(uuid(id, "endpoint"));
    return undefined;
  }, ["/webhooks"]);
}

export async function retryWebhookDelivery(id: string): Promise<ActionResult> {
  return run(async () => {
    await getAdminApi().retryWebhookDelivery(uuid(id, "delivery"));
    return undefined;
  }, ["/webhooks"]);
}

// API keys. A secret comes back once, to the dialog that shows it; nothing here logs or keeps it.

function keyLabel(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new InputError("Invalid label");
  if (value.trim().length > 100) throw new InputError("The label can be at most 100 characters");
  return value.trim() || null;
}

/** A new seller: its storefront and first API key. */
/** A ready-made storefront's owner email and address, checked here so a bad one stops before the seller is made. */
export type StorefrontRequest = { email: string; subdomain: string };

function storefrontInput(name: string, request: StorefrontRequest): NewStorefrontInput {
  const email = text(request?.email, "Owner email", 254).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new InputError("Enter the owner's email address");
  const subdomain = typeof request?.subdomain === "string" ? request.subdomain.trim().toLowerCase() : "";
  if (subdomain && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain))
    throw new InputError("The address can only use letters, digits and dashes");
  return { name, email, ...(subdomain ? { subdomain } : {}) };
}

/** A new seller with its first key, and with `storefront`, a ready-made storefront built for it. */
export async function createSeller(
  name: string,
  maxTenants: number | null,
  storefront: StorefrontRequest | null = null,
  startFrom: string | null = null
): Promise<ActionResult<NewSeller>> {
  return run(async () => {
    if (maxTenants !== null && !(Number.isInteger(maxTenants) && maxTenants >= 0 && maxTenants <= 100000))
      throw new InputError("Store limit must be a whole number, 0 or more, or empty for no limit");
    const sellerName = text(name, "Seller name", 100);
    const input = storefront ? storefrontInput(sellerName, storefront) : null;
    const api = getAdminApi();
    const seller = await api.createSeller({
      name: sellerName,
      maxTenants,
      ...(startFrom ? { startFrom: uuid(startFrom, "storefront") } : {})
    });
    if (!input) return seller;
    // The seller exists now; a storefront that can't be built is reported, not a failed action.
    try {
      return { ...seller, storefront: await api.createStorefront(seller.productId, input) };
    } catch (error) {
      if (!(error instanceof AdminApiError)) throw error;
      return { ...seller, storefrontError: error.apiMessage ?? error.message };
    }
  }, ["/keys", "/"]);
}

/**
 * Approves an application to sell: its storefront with maxTenants stores, the applicant invited as owner.
 * With `reseller`, a reseller account with that storefront inside and up to maxProducts storefronts. Platform admin only.
 */
export async function approveApplication(
  id: string,
  maxTenants: number | null,
  storefront: boolean,
  reseller?: { maxProducts: number | null }
): Promise<ActionResult<ApprovedApplication>> {
  return run(async () => {
    await adminOnly();
    const ok = (n: number | null) => n === null || (Number.isInteger(n) && n >= 0 && n <= 100000);
    if (!ok(maxTenants)) throw new InputError("Store limit must be a whole number, 0 or more, or empty for no limit");
    if (reseller && !ok(reseller.maxProducts)) throw new InputError("Storefront limit must be a whole number, 0 or more, or empty for no limit");
    return getAdminApi().approveApplication(uuid(id, "application"), {
      maxTenants,
      storefront: storefront === true,
      ...(reseller ? { reseller: true, maxProducts: reseller.maxProducts } : {})
    });
  }, ["/applications", "/resellers", "/keys", "/"]);
}

/** Declines an application to sell; the API emails the applicant. Platform admin only. */
export async function declineApplication(id: string): Promise<ActionResult> {
  return run(async () => {
    await adminOnly();
    await getAdminApi().declineApplication(uuid(id, "application"));
    return undefined;
  }, ["/applications"]);
}

async function adminOnly(what = "review applications") {
  if (!(await getViewer())?.isAdmin) throw new InputError(`Only the platform admin can ${what}.`);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function limit(value: unknown, what: string): number | null {
  if (value === null) return null;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100000) return value;
  throw new InputError(`${what} must be a whole number, 0 or more, or empty for no limit`);
}

function listPrice(value: unknown, what: string): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1_000_000) return value;
  throw new InputError(`${what} price must be from $0 to $10,000 a month`);
}

function resellerSettings(input: ResellerSettings): ResellerSettings {
  const wholesale = input.wholesalePercent;
  if (!(typeof wholesale === "number" && Number.isInteger(wholesale) && wholesale >= 0 && wholesale <= 100))
    throw new InputError("Wholesale discount must be a whole number from 0 to 100");
  const email = typeof input.billingEmail === "string" ? input.billingEmail.trim() : "";
  if (email && (email.length > 254 || !EMAIL.test(email))) throw new InputError("Billing email is not an email address");
  const brandName = typeof input.brandName === "string" ? input.brandName.trim() : "";
  if (brandName.length > 60) throw new InputError("Brand name must be at most 60 characters");
  const brandUrl = typeof input.brandUrl === "string" ? input.brandUrl.trim() : "";
  if (brandUrl && (brandUrl.length > 500 || !/^https?:\/\/\S+$/.test(brandUrl))) throw new InputError("Brand link must start with https://");
  if (input.autoInvoice !== undefined && typeof input.autoInvoice !== "boolean") throw new InputError("Automatic invoices must be on or off");
  const customer = typeof input.stripeCustomerId === "string" ? input.stripeCustomerId.trim() : input.stripeCustomerId;
  if (customer && !/^cus_[A-Za-z0-9]{1,250}$/.test(customer)) throw new InputError("Stripe customer must be a Stripe customer id (cus_…)");
  return {
    name: text(input.name, "Name", 100),
    maxProducts: limit(input.maxProducts, "Storefront limit"),
    maxTenants: limit(input.maxTenants, "Store limit"),
    wholesalePercent: wholesale,
    billingEmail: email || null,
    brandName: brandName || null,
    brandUrl: brandUrl || null,
    listPriceCents: {
      small: listPrice(input.listPriceCents?.small, "Small"),
      medium: listPrice(input.listPriceCents?.medium, "Medium"),
      large: listPrice(input.listPriceCents?.large, "Large")
    },
    ...(input.autoInvoice !== undefined && { autoInvoice: input.autoInvoice }),
    ...(customer !== undefined && { stripeCustomerId: customer || null })
  };
}

/** A new reseller account, with those storefronts moved into it. Platform admin only. */
export async function createReseller(input: ResellerSettings, productIds: string[]): Promise<ActionResult<Reseller>> {
  return run(async () => {
    await adminOnly("manage resellers");
    if (!Array.isArray(productIds) || productIds.length > 100) throw new InputError("Choose up to 100 storefronts");
    const settings = resellerSettings(input);
    return getAdminApi().createReseller({ ...settings, productIds: productIds.map((id) => uuid(id, "storefront")) });
  }, ["/resellers", "/keys"]);
}

/** Saves a reseller's settings. Platform admin only. */
export async function updateReseller(id: string, input: ResellerSettings): Promise<ActionResult<Reseller>> {
  return run(async () => {
    await adminOnly("manage resellers");
    return getAdminApi().updateReseller(uuid(id, "reseller"), resellerSettings(input));
  }, ["/resellers"]);
}

/** Sends a month's bill as a Stripe invoice now, or tries a failed one again. Platform admin only. */
export async function sendResellerInvoice(id: string, month: string): Promise<ActionResult<ResellerInvoice>> {
  return run(async () => {
    await adminOnly("manage resellers");
    if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new InputError("Month must be YYYY-MM");
    return getAdminApi().sendResellerInvoice(uuid(id, "reseller"), month);
  }, ["/resellers"]);
}

/** Deletes a reseller with no storefronts. Platform admin only. */
export async function deleteReseller(id: string): Promise<ActionResult> {
  return run(async () => {
    await adminOnly("manage resellers");
    await getAdminApi().deleteReseller(uuid(id, "reseller"));
    return undefined;
  }, ["/resellers"]);
}

/** Moves a storefront into (add) or out of a reseller. Platform admin only. */
export async function setResellerStorefront(id: string, productId: string, add: boolean): Promise<ActionResult> {
  return run(async () => {
    await adminOnly("manage resellers");
    const api = getAdminApi();
    if (add) await api.addResellerProduct(uuid(id, "reseller"), uuid(productId, "storefront"));
    else await api.removeResellerProduct(uuid(id, "reseller"), uuid(productId, "storefront"));
    return undefined;
  }, ["/resellers", "/keys"]);
}

/** A new partner key for a reseller: works on every storefront it has. Platform admin only. */
export async function createPartnerKey(id: string, label: string): Promise<ActionResult<NewApiKey>> {
  return run(async () => {
    await adminOnly("manage resellers");
    return getAdminApi().createPartnerKey(uuid(id, "reseller"), keyLabel(label));
  }, ["/resellers"]);
}

/** Replaces a partner key; the old one keeps working for graceHours. Platform admin only. */
export async function rotatePartnerKey(id: string, keyId: string, graceHours: number): Promise<ActionResult<NewApiKey>> {
  return run(async () => {
    await adminOnly("manage resellers");
    if (!Number.isInteger(graceHours) || graceHours < 0 || graceHours > 720) throw new InputError("Invalid grace period");
    return getAdminApi().rotatePartnerKey(uuid(id, "reseller"), uuid(keyId, "key"), graceHours);
  }, ["/resellers"]);
}

/** Revokes a partner key now. Platform admin only. */
export async function revokePartnerKey(id: string, keyId: string): Promise<ActionResult> {
  return run(async () => {
    await adminOnly("manage resellers");
    await getAdminApi().revokePartnerKey(uuid(id, "reseller"), uuid(keyId, "key"));
    return undefined;
  }, ["/resellers"]);
}

/** Builds a ready-made storefront for an existing seller. */
export async function buildStorefront(productId: string, name: string, request: StorefrontRequest): Promise<ActionResult<ReadyStorefront>> {
  return run(
    async () => getAdminApi().createStorefront(uuid(productId, "storefront"), storefrontInput(text(name, "Storefront name", 100), request)),
    ["/keys"]
  );
}

export async function createApiKey(productId: string, label: string): Promise<ActionResult<NewApiKey>> {
  return run(async () => getAdminApi().createApiKey(uuid(productId, "storefront"), keyLabel(label)), ["/keys"]);
}

/** Replaces a key with a new one; the old key keeps working for graceHours. */
export async function rotateApiKey(productId: string, keyId: string, graceHours: number): Promise<ActionResult<NewApiKey>> {
  return run(async () => {
    if (!Number.isInteger(graceHours) || graceHours < 0 || graceHours > 720) throw new InputError("Invalid grace period");
    return getAdminApi().rotateApiKey(uuid(productId, "storefront"), uuid(keyId, "key"), graceHours);
  }, ["/keys"]);
}

export async function revokeApiKey(productId: string, keyId: string): Promise<ActionResult> {
  return run(async () => {
    await getAdminApi().revokeApiKey(uuid(productId, "storefront"), uuid(keyId, "key"));
    return undefined;
  }, ["/keys"]);
}

// Teams. The API decides who may change what (only owners touch owners, nobody removes themselves).

const TEAM_ROLES: readonly TeamRole[] = ["owner", "admin", "member"];

function teamRole(value: unknown): TeamRole {
  if (!TEAM_ROLES.includes(value as TeamRole)) throw new InputError("Choose owner, admin or member");
  return value as TeamRole;
}

/**
 * Runs a team change and refreshes the team's page. The team is a storefront's id, or a reseller's,
 * which only the platform admin manages.
 */
async function teamChange<T>(of: TeamOf, work: (checked: TeamOf) => Promise<T>): Promise<ActionResult<T>> {
  if (typeof of === "string") return run(() => work(uuid(of, "storefront")), ["/team"]);
  return run(async () => {
    await adminOnly("manage resellers");
    return work({ resellerId: uuid(of?.resellerId, "reseller") });
  }, ["/resellers"]);
}

/** Invites someone by email; the API emails them the link. */
export async function inviteTeammate(of: TeamOf, email: string, role: TeamRole): Promise<ActionResult<NewInvitation>> {
  return teamChange(of, (checked) => {
    const address = text(email, "Email address", 254).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) throw new InputError("Enter an email address");
    return getAdminApi().invite(checked, address, teamRole(role));
  });
}

export async function cancelInvitation(of: TeamOf, invitationId: string): Promise<ActionResult> {
  return teamChange(of, async (checked) => {
    await getAdminApi().cancelInvitation(checked, uuid(invitationId, "invitation"));
    return undefined;
  });
}

export async function setMemberRole(of: TeamOf, memberId: string, role: TeamRole): Promise<ActionResult> {
  return teamChange(of, async (checked) => {
    await getAdminApi().setMemberRole(checked, uuid(memberId, "member"), teamRole(role));
    return undefined;
  });
}

export async function removeMember(of: TeamOf, memberId: string): Promise<ActionResult> {
  return teamChange(of, async (checked) => {
    await getAdminApi().removeMember(checked, uuid(memberId, "member"));
    return undefined;
  });
}

// Branding: a storefront's own look, or a reseller's (platform admin only). The API checks the
// image itself; these checks only save a round trip.

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** A storefront's id, or a reseller's, checked like a team's. */
async function brandChange<T>(of: TeamOf, work: (checked: TeamOf) => Promise<T>): Promise<ActionResult<T>> {
  // "/" refreshes every page: the sidebar, tab title and icon show the brand.
  if (typeof of === "string") return run(() => work(uuid(of, "storefront")), ["/"]);
  return run(async () => {
    await adminOnly("manage resellers");
    return work({ resellerId: uuid(of?.resellerId, "reseller") });
  }, ["/resellers"]);
}

function optional(value: unknown, what: string, max: number): string | null {
  if (value === null || value === undefined || (typeof value === "string" && !value.trim())) return null;
  if (typeof value !== "string" || value.trim().length > max) throw new InputError(`${what} is too long`);
  return value.trim();
}

export async function saveBranding(of: TeamOf, fields: BrandingFields): Promise<ActionResult<BrandingView>> {
  return brandChange(of, (checked) => {
    const color = optional(fields?.color, "Color", 7);
    if (color && !HEX_COLOR.test(color)) throw new InputError("Choose a color like #1d4ed8");
    const supportEmail = optional(fields?.supportEmail, "Support email", 254);
    if (supportEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(supportEmail)) throw new InputError("Enter a support email address");
    return getAdminApi().updateBranding(checked, { name: optional(fields?.name, "Name", 60), color, supportEmail });
  });
}

/** form: `kind` (logo or icon) and `file`. */
export async function uploadBrandImage(of: TeamOf, form: FormData): Promise<ActionResult<BrandingView>> {
  return brandChange(of, async (checked) => {
    const kind = form.get("kind");
    if (kind !== "logo" && kind !== "icon") throw new InputError("Choose the logo or the icon");
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new InputError("Choose an image");
    if (file.size > BRAND_IMAGE_LIMITS[kind]) throw new InputError(`The ${kind} must be at most ${BRAND_IMAGE_LIMITS[kind] / 1024} KB`);
    return getAdminApi().uploadBrandImage(checked, kind, new Uint8Array(await file.arrayBuffer()));
  });
}

export async function removeBrandImage(of: TeamOf, kind: BrandImage): Promise<ActionResult<BrandingView>> {
  return brandChange(of, (checked) => {
    if (kind !== "logo" && kind !== "icon") throw new InputError("Choose the logo or the icon");
    return getAdminApi().removeBrandImage(checked, kind);
  });
}

// A storefront's own dashboard address. The API checks the domain itself.

export async function setDashboardDomain(productId: string, domain: string): Promise<ActionResult<DashboardDomainView>> {
  return run(() => getAdminApi().setDashboardDomain(uuid(productId, "storefront"), text(domain, "Address", 253)), ["/branding"]);
}

export async function checkDashboardDomain(productId: string): Promise<ActionResult<DashboardDomainView>> {
  return run(() => getAdminApi().checkDashboardDomain(uuid(productId, "storefront")), ["/branding"]);
}

export async function removeDashboardDomain(productId: string): Promise<ActionResult<DashboardDomainView>> {
  return run(() => getAdminApi().removeDashboardDomain(uuid(productId, "storefront")), ["/branding"]);
}
