"use server";

import { revalidatePath } from "next/cache";

import { auth, isAllowed } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import { AdminApiError } from "@/lib/api/http";
import type { Created, CreateTemplateInput, CreateVersionInput, MailDomain } from "@/lib/api/types";

// Every change the dashboard makes goes through these actions. Server actions can be
// called directly, not only from our pages, so each one checks the session itself.

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function run<T>(work: () => Promise<T>, revalidate: string[]): Promise<ActionResult<T>> {
  const session = await auth();
  if (!isAllowed(session?.user?.login)) return { ok: false, error: "You are signed out. Sign in again." };
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
