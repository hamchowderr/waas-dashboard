"use server";

import { revalidatePath } from "next/cache";

import { canChange, canUseDashboard, getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { AdminApiError } from "@/lib/api/http";
import type {
  Created,
  CreateTemplateInput,
  CreateVersionInput,
  ImportCode,
  MailDomain,
  StoreSize,
  ApprovedApplication,
  NewAgency,
  NewApiKey,
  NewInvitation,
  NewStorefrontInput,
  ReadyStorefront,
  TeamRole,
  WebhookEndpointChange,
  WebhookEndpointInput,
  WebhookEventType,
  WebhookSecret
} from "@/lib/api/types";
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

/** A new storefront for an agency, with its first API key. */
/** A ready-made storefront's owner email and address, checked here so a bad one stops before the agency is made. */
export type StorefrontRequest = { email: string; subdomain: string };

function storefrontInput(name: string, request: StorefrontRequest): NewStorefrontInput {
  const email = text(request?.email, "Owner email", 254).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new InputError("Enter the owner's email address");
  const subdomain = typeof request?.subdomain === "string" ? request.subdomain.trim().toLowerCase() : "";
  if (subdomain && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain))
    throw new InputError("The address can only use letters, digits and dashes");
  return { name, email, ...(subdomain ? { subdomain } : {}) };
}

/** A new agency with its first key, and with `storefront`, a ready-made storefront built for it. */
export async function createAgency(
  name: string,
  maxTenants: number | null,
  storefront: StorefrontRequest | null = null
): Promise<ActionResult<NewAgency>> {
  return run(async () => {
    if (maxTenants !== null && !(Number.isInteger(maxTenants) && maxTenants >= 0 && maxTenants <= 100000))
      throw new InputError("Store limit must be a whole number, 0 or more, or empty for no limit");
    const agencyName = text(name, "Agency name", 100);
    const input = storefront ? storefrontInput(agencyName, storefront) : null;
    const api = getAdminApi();
    const agency = await api.createAgency({ name: agencyName, maxTenants });
    if (!input) return agency;
    // The agency exists now; a storefront that can't be built is reported, not a failed action.
    try {
      return { ...agency, storefront: await api.createStorefront(agency.productId, input) };
    } catch (error) {
      if (!(error instanceof AdminApiError)) throw error;
      return { ...agency, storefrontError: error.apiMessage ?? error.message };
    }
  }, ["/keys", "/"]);
}

/** Approves an application to sell: its storefront with maxTenants stores, the applicant invited as owner. Platform admin only. */
export async function approveApplication(
  id: string,
  maxTenants: number | null,
  storefront: boolean
): Promise<ActionResult<ApprovedApplication>> {
  return run(async () => {
    await adminOnly();
    if (maxTenants !== null && !(Number.isInteger(maxTenants) && maxTenants >= 0 && maxTenants <= 100000))
      throw new InputError("Store limit must be a whole number, 0 or more, or empty for no limit");
    return getAdminApi().approveApplication(uuid(id, "application"), { maxTenants, storefront: storefront === true });
  }, ["/applications", "/keys", "/"]);
}

/** Declines an application to sell; the API emails the applicant. Platform admin only. */
export async function declineApplication(id: string): Promise<ActionResult> {
  return run(async () => {
    await adminOnly();
    await getAdminApi().declineApplication(uuid(id, "application"));
    return undefined;
  }, ["/applications"]);
}

async function adminOnly() {
  if (!(await getViewer())?.isAdmin) throw new InputError("Only the platform admin can review applications.");
}

/** Builds a ready-made storefront for an existing agency. */
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

/** Invites someone by email; the API emails them the link. */
export async function inviteTeammate(productId: string, email: string, role: TeamRole): Promise<ActionResult<NewInvitation>> {
  return run(async () => {
    const address = text(email, "Email address", 254).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) throw new InputError("Enter an email address");
    return getAdminApi().invite(uuid(productId, "storefront"), address, teamRole(role));
  }, ["/team"]);
}

export async function cancelInvitation(productId: string, invitationId: string): Promise<ActionResult> {
  return run(async () => {
    await getAdminApi().cancelInvitation(uuid(productId, "storefront"), uuid(invitationId, "invitation"));
    return undefined;
  }, ["/team"]);
}

export async function setMemberRole(productId: string, memberId: string, role: TeamRole): Promise<ActionResult> {
  return run(async () => {
    await getAdminApi().setMemberRole(uuid(productId, "storefront"), uuid(memberId, "member"), teamRole(role));
    return undefined;
  }, ["/team"]);
}

export async function removeMember(productId: string, memberId: string): Promise<ActionResult> {
  return run(async () => {
    await getAdminApi().removeMember(uuid(productId, "storefront"), uuid(memberId, "member"));
    return undefined;
  }, ["/team"]);
}
