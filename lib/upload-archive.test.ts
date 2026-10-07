import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MAX_UPLOAD_BYTES,
  describeUnreachable,
  describeUploadFailure,
  uploadArchive,
  uploadSizeError,
  uploadUrlExpiry
} from "./upload-archive";

// A pre-signed PUT as the API makes it: signed at 2026-10-07 12:00:00 UTC, valid for an hour.
const URL_ = "https://acct.r2.cloudflarestorage.com/waas-stores/uploads/v1.tgz?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20261007T120000Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=abc";
const EXPIRES = new Date("2026-10-07T13:00:00Z");

const fileOfSize = (size: number) => {
  const file = new File(["x"], "site.tgz");
  Object.defineProperty(file, "size", { value: size });
  return file;
};

/** A stand-in XMLHttpRequest; `outcome` decides how the next request ends. */
let outcome: { status: number; body?: string } | "network-error" = { status: 200 };
class FakeXhr {
  status = 0;
  responseText = "";
  upload: { onprogress?: (event: { lengthComputable: boolean; loaded: number; total: number }) => void } = {};
  onload?: () => void;
  onerror?: () => void;
  onabort?: () => void;
  open() {}
  send() {
    this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 2 });
    if (outcome === "network-error") return this.onerror?.();
    this.status = outcome.status;
    this.responseText = outcome.body ?? "";
    this.onload?.();
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  outcome = { status: 200 };
});

describe("uploadSizeError", () => {
  it("accepts a normal archive and no file", () => {
    expect(uploadSizeError(fileOfSize(1024))).toBeNull();
    expect(uploadSizeError(null)).toBeNull();
  });
  it("refuses empty and oversized files", () => {
    expect(uploadSizeError(fileOfSize(0))).toMatch(/empty/);
    expect(uploadSizeError(fileOfSize(MAX_UPLOAD_BYTES + 1))).toMatch(/at most 4\.0 GB/);
  });
});

describe("uploadUrlExpiry", () => {
  it("reads the signing time plus X-Amz-Expires", () => {
    expect(uploadUrlExpiry(URL_)).toEqual(EXPIRES);
  });
  it("is null for URLs that don't say", () => {
    expect(uploadUrlExpiry("https://example.com/file")).toBeNull();
    expect(uploadUrlExpiry("fixture:upload")).toBeNull();
    expect(uploadUrlExpiry("not a url")).toBeNull();
  });
});

describe("describeUploadFailure", () => {
  it("names a too-large file", () => {
    expect(describeUploadFailure(400, "<Error><Code>EntityTooLarge</Code></Error>")).toMatch(/too large/);
    expect(describeUploadFailure(413)).toMatch(/too large/);
  });
  it("names an expired link", () => {
    expect(describeUploadFailure(403, "<Error><Code>ExpiredRequest</Code></Error>")).toMatch(/expired/);
    expect(describeUploadFailure(403)).toMatch(/may have expired/);
  });
  it("falls back to the status and code", () => {
    expect(describeUploadFailure(503)).toMatch(/HTTP 503.*try again/i);
    expect(describeUploadFailure(400, "<Code>InvalidArgument</Code>")).toBe("Storage refused the upload (HTTP 400, InvalidArgument).");
  });
});

describe("describeUnreachable", () => {
  it("says expired once the link's time is up", () => {
    expect(describeUnreachable(URL_, EXPIRES)).toMatch(/expired/);
  });
  it("otherwise points at the connection or the bucket's CORS rule", () => {
    expect(describeUnreachable(URL_, new Date("2026-10-07T12:30:00Z"))).toMatch(/CORS/);
  });
});

describe("uploadArchive", () => {
  const during = () => vi.useFakeTimers({ now: new Date("2026-10-07T12:10:00Z"), toFake: ["Date"] });

  it("resolves on 2xx and reports progress", async () => {
    during();
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const progress: number[] = [];
    await uploadArchive(URL_, fileOfSize(10), (f) => progress.push(f));
    expect(progress).toEqual([0.5]);
  });
  it("rejects with a readable message on a refused upload", async () => {
    during();
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    outcome = { status: 400, body: "<Error><Code>EntityTooLarge</Code></Error>" };
    await expect(uploadArchive(URL_, fileOfSize(10), () => {})).rejects.toThrow(/too large/);
  });
  it("explains a blocked request as connection or CORS", async () => {
    during();
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    outcome = "network-error";
    await expect(uploadArchive(URL_, fileOfSize(10), () => {})).rejects.toThrow(/CORS/);
  });
  it("doesn't send with an expired link or an oversized file", async () => {
    const send = vi.fn();
    vi.stubGlobal("XMLHttpRequest", class extends FakeXhr { send = send; });
    vi.useFakeTimers({ now: EXPIRES, toFake: ["Date"] });
    await expect(uploadArchive(URL_, fileOfSize(10), () => {})).rejects.toThrow(/expired/);
    during();
    await expect(uploadArchive(URL_, fileOfSize(MAX_UPLOAD_BYTES + 1), () => {})).rejects.toThrow(/at most/);
    expect(send).not.toHaveBeenCalled();
  });
});
