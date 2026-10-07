import { FIXTURE_UPLOAD_URL } from "@/lib/api/upload";
import { formatBytes } from "@/lib/format";

/** The API takes archives of at most 4 GB in one PUT (WPCS createVersion). */
export const MAX_UPLOAD_BYTES = 4 * 1024 ** 3;

/** Why a file can't be uploaded, checked before anything is created; null when it can. */
export function uploadSizeError(file: File | null): string | null {
  if (!file) return null;
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_UPLOAD_BYTES)
    return `This file is ${formatBytes(file.size)}; archives can be at most ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  return null;
}

/** When a pre-signed (SigV4 query) URL stops working, or null if the URL doesn't say. */
export function uploadUrlExpiry(url: string): Date | null {
  let params: URLSearchParams;
  try {
    params = new URL(url).searchParams;
  } catch {
    return null;
  }
  const date = params.get("X-Amz-Date")?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  const seconds = Number(params.get("X-Amz-Expires"));
  if (!date || !Number.isFinite(seconds) || seconds <= 0) return null;
  const [, y, mo, d, h, mi, s] = date.map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s) + seconds * 1000);
}

const EXPIRED = "The upload link expired before the upload finished. Create it again to get a fresh link.";

/** A readable reason for a response that isn't 2xx; `body` is the S3-style XML error, if readable. */
export function describeUploadFailure(status: number, body = ""): string {
  const code = body.match(/<Code>([^<]+)<\/Code>/)?.[1];
  if (code === "EntityTooLarge" || status === 413)
    return `Storage refused the file as too large (at most ${formatBytes(MAX_UPLOAD_BYTES)}).`;
  if (code === "ExpiredRequest" || /expired/i.test(body)) return EXPIRED;
  if (status === 403) return "Storage refused the upload link (HTTP 403). It may have expired; create it again to get a fresh link.";
  if (status >= 500) return `Storage had a problem (HTTP ${status}). Try again in a few minutes.`;
  return `Storage refused the upload (HTTP ${status}${code ? `, ${code}` : ""}).`;
}

/**
 * Why a request that never got a readable response failed. The browser hides the reason: a
 * bucket without a CORS rule for this site and an expired link (R2 sends no CORS headers on
 * that 403) look the same as a dropped connection, so the link's own expiry tells them apart.
 */
export function describeUnreachable(url: string, now = new Date()): string {
  const expiry = uploadUrlExpiry(url);
  if (expiry && now >= expiry) return EXPIRED;
  return (
    "The browser couldn't send the file to storage. Either the connection dropped, or the storage bucket " +
    `doesn't allow uploads from ${typeof location === "undefined" ? "this site" : location.origin} (its CORS rule).`
  );
}

/**
 * Sends an archive straight from the browser to the upload URL the API returned (a single
 * PUT, as WPCS uploads work), reporting progress from 0 to 1. With sample data the URL is
 * a placeholder and nothing is sent. Rejects with an Error whose message is ready to show.
 */
export function uploadArchive(url: string, file: File, onProgress: (fraction: number) => void): Promise<void> {
  if (url === FIXTURE_UPLOAD_URL) {
    return new Promise((resolve) => {
      let fraction = 0;
      const timer = setInterval(() => {
        fraction = Math.min(1, fraction + 0.2);
        onProgress(fraction);
        if (fraction >= 1) {
          clearInterval(timer);
          resolve();
        }
      }, 150);
    });
  }
  const tooBig = uploadSizeError(file);
  if (tooBig) return Promise.reject(new Error(tooBig));
  const expiry = uploadUrlExpiry(url);
  if (expiry && Date.now() >= expiry.getTime()) return Promise.reject(new Error(EXPIRED));

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(describeUploadFailure(request.status, request.responseText)));
    request.onerror = () => reject(new Error(describeUnreachable(url)));
    request.onabort = () => reject(new Error("The upload was cancelled."));
    request.send(file);
  });
}
