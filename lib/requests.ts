import type { ApiRequest } from "./api/types";

/** The Requests page's time choices: the window each one shows, in milliseconds. */
export const REQUEST_WINDOWS = {
  hour: { label: "Last hour", ms: 60 * 60_000 },
  day: { label: "24 hours", ms: 24 * 60 * 60_000 },
  week: { label: "7 days", ms: 7 * 24 * 60 * 60_000 }
} as const;

export type RequestWindow = keyof typeof REQUEST_WINDOWS;

export function isRequestWindow(value: string | undefined): value is RequestWindow {
  return value !== undefined && Object.hasOwn(REQUEST_WINDOWS, value);
}

/** The ISO time a window starts at, or undefined for the whole log. */
export function windowStart(window: string | undefined, now = Date.now()): string | undefined {
  return isRequestWindow(window) ? new Date(now - REQUEST_WINDOWS[window].ms).toISOString() : undefined;
}

/**
 * What made a call, in plain words: the API key by its label (or the start of its id), a person
 * signed in to this dashboard, or the platform admin.
 */
export function madeWith(r: Pick<ApiRequest, "source" | "apiKeyId" | "apiKeyLabel" | "userId">): string {
  if (r.apiKeyId) return r.apiKeyLabel || `Key ${r.apiKeyId.slice(0, 8)}`;
  if (r.source === "admin") return "Platform admin";
  if (r.userId) return "Signed-in person";
  return "No key";
}

/** Known calls, matched on the method and the path with ids taken out (":id") and the /v1, /admin or /account prefix dropped. */
const requestDescriptions: [method: string, path: RegExp, text: string][] = [
  ["GET", /^\/tenants$/, "Listed stores"],
  ["POST", /^(\/products\/:id)?\/tenants$/, "Created a store"],
  ["GET", /^\/tenants\/:id$/, "Looked up a store"],
  ["PUT", /^\/tenants\/:id$/, "Changed a store"],
  ["DELETE", /^\/tenants\/:id$/, "Deleted a store"],
  ["POST", /^\/tenants\/:id\/backups$/, "Backed up a store"],
  ["POST", /^\/tenants\/:id\/(restore|rollback)$/, "Restored a store from a backup"],
  ["POST", /^\/tenants\/:id\/suspend$/, "Suspended a store"],
  ["POST", /^\/tenants\/:id\/resume$/, "Resumed a store"],
  ["POST", /^\/tenants\/:id\/version$/, "Moved a store to a version"],
  ["PUT", /^\/tenants\/:id\/domains\/main$/, "Changed a store's address"],
  ["POST", /^\/tenants\/:id\/domains?$/, "Added a domain to a store"],
  ["DELETE", /^\/tenants\/:id\/domains$/, "Removed a domain from a store"],
  ["GET", /^\/tenants\/:id\/domains/, "Checked a store's domains"],
  ["PUT", /^\/tenants\/:id\/mail-domain$/, "Set a store's email domain"],
  ["DELETE", /^\/tenants\/:id\/mail-domain$/, "Removed a store's email domain"],
  ["GET", /^\/tenants\/:id\/(mail-domain|domain-connect)$/, "Checked a store's email domain"],
  ["POST", /^\/tenants\/:id\/import-code$/, "Made an import code"],
  ["GET", /^\/plugins\/[^/]+\/update$/, "Checked for a plugin update"],
  ["GET", /^(\/products\/:id)?\/versions$/, "Listed versions"],
  ["POST", /^(\/products\/:id)?\/versions$/, "Built a version"],
  ["PUT", /\/versions\/:id\/production$/, "Made a version live"],
  ["DELETE", /\/versions\/:id$/, "Deleted a version"],
  ["POST", /\/keys$/, "Made an API key"],
  ["POST", /\/keys\/:id\/rotate$/, "Replaced an API key"],
  ["DELETE", /\/keys\/:id$/, "Deleted an API key"],
  ["POST", /^\/webhooks$/, "Added a webhook"],
  ["POST", /^\/webhooks\/:id\/test$/, "Sent a test webhook"],
  ["POST", /\/deliveries\/:id\/retry$/, "Sent a webhook again"],
  ["POST", /^\/jobs\/failures\/:id\/retry$/, "Retried a failed job"],
  ["GET", /^\/overview$/, "Opened the overview"]
];

const verbs: Record<string, string> = { GET: "Looked up", POST: "Sent", PUT: "Changed", PATCH: "Changed", DELETE: "Removed" };

/** A call in plain words ("Backed up a store"); calls not listed above read as "<verb> <last part of the path>". */
export function describeRequest(r: Pick<ApiRequest, "method" | "path"> & { query?: string | null }): string {
  const path = r.path
    .replace(/^\/(v1|admin|account)(?=\/|$)/, "")
    .split("/")
    .map((part) => (/^[0-9a-f]{8}-|^[a-z]+_[0-9A-Za-z]+$|^\d+$/i.test(part) ? ":id" : part))
    .join("/");
  const method = r.method.toUpperCase();
  if (method === "GET" && path === "/tenants" && r.query?.includes("externalId=")) return "Looked up a store by subscription";
  const known = requestDescriptions.find(([m, pattern]) => m === method && pattern.test(path));
  if (known) return known[2];
  const noun = path.split("/").filter((part) => part && part !== ":id").pop() ?? "the API";
  return `${verbs[method] ?? method} ${noun.replace(/[-_]/g, " ")}`;
}
