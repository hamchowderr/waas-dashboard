import { FIXTURE_UPLOAD_URL } from "@/lib/api/upload";

/**
 * Sends an archive straight from the browser to the upload URL the API returned (a single
 * PUT, as WPCS uploads work), reporting progress from 0 to 1. With sample data the URL is
 * a placeholder and nothing is sent.
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
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`The upload was refused (HTTP ${request.status}).`));
    request.onerror = () => reject(new Error("The upload could not reach the storage server."));
    request.send(file);
  });
}
