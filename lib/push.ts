/** The VAPID public key (URL-safe base64) as the bytes PushManager.subscribe() wants. */
export function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** iPhone and iPad only allow web alerts for a site added to the Home Screen and opened from there. */
export function needsHomeScreen(userAgent: string, standalone: boolean): boolean {
  const apple = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && /Mobile/.test(userAgent));
  return apple && !standalone;
}
