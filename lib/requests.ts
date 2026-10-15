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
