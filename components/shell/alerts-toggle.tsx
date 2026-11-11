"use client";

import * as React from "react";
import { BellRingIcon } from "lucide-react";
import { toast } from "sonner";

import { disablePush, enablePush, getPushSettings } from "@/app/(dashboard)/actions";
import { Switch } from "@/components/ui/switch";
import { keyBytes, needsHomeScreen } from "@/lib/push";

type State =
  | { kind: "loading" }
  | { kind: "off" }
  | { kind: "error"; message: string }
  | { kind: "unsupported" }
  | { kind: "home-screen" }
  | { kind: "blocked" }
  | { kind: "ready"; publicKey: string; on: boolean };

const SW_URL = "/sw.js";

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/**
 * "Alerts on this device" in the bell: phone and computer alerts for the important notices, through
 * the service worker in public/sw.js. Shown in the bell and on the Notifications page (`variant="card"`).
 */
export function AlertsToggle({ variant = "bell" }: { variant?: "bell" | "card" }) {
  const [state, setState] = React.useState<State>({ kind: "loading" });
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    (async () => {
      const result = await getPushSettings().catch(() => null);
      if (!live) return;
      if (!result?.ok) return setState({ kind: "error", message: result?.error ?? "The provisioning API did not answer." });
      if (!result.data.enabled || !result.data.publicKey) return setState({ kind: "off" });
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
      if (needsHomeScreen(navigator.userAgent, standalone)) return setState({ kind: "home-screen" });
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState({ kind: "unsupported" });
      if (Notification.permission === "denied") return setState({ kind: "blocked" });
      const sub = await currentSubscription().catch(() => null);
      if (live) setState({ kind: "ready", publicKey: result.data.publicKey, on: !!sub && Notification.permission === "granted" });
    })();
    return () => {
      live = false;
    };
  }, []);

  async function turnOn(publicKey: string) {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(permission === "denied" ? { kind: "blocked" } : { kind: "ready", publicKey, on: false });
      return;
    }
    const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/", updateViaCache: "none" });
    await navigator.serviceWorker.ready;
    const sub =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    const saved = await enablePush({ endpoint: json.endpoint ?? "", keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" } });
    if (!saved.ok) {
      await sub.unsubscribe().catch(() => undefined);
      throw new Error(saved.error);
    }
    setState({ kind: "ready", publicKey, on: true });
    toast.success("Alerts are on for this device.");
  }

  async function turnOff(publicKey: string) {
    const sub = await currentSubscription();
    if (sub) {
      await disablePush(sub.endpoint);
      await sub.unsubscribe();
    }
    setState({ kind: "ready", publicKey, on: false });
  }

  async function onChange(next: boolean) {
    if (state.kind !== "ready") return;
    setBusy(true);
    try {
      await (next ? turnOn(state.publicKey) : turnOff(state.publicKey));
    } catch (error) {
      toast.error((error as Error).message || "Alerts couldn't be turned on. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === "loading") return null;

  const note =
    state.kind === "off"
      ? "Alerts aren't switched on for this dashboard yet."
      : state.kind === "error"
        ? `Couldn't check alerts: ${state.message}`
        : state.kind === "home-screen"
      ? "On iPhone and iPad, add AnyPress to your Home Screen first (Share, then Add to Home Screen), then open it from there."
      : state.kind === "unsupported"
        ? "This browser can't show alerts."
        : state.kind === "blocked"
          ? "Alerts are blocked for this site in your browser's settings."
          : "Ready stores, failed tasks and backups, and new applications, even when the dashboard is closed.";

  return (
    <div className={variant === "bell" ? "flex items-start gap-3 border-t px-4 py-3" : "flex items-start gap-3"}>
      <BellRingIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <label htmlFor="alerts-on-device" className="text-sm font-medium">
          Alerts on this device
        </label>
        <p className="text-muted-foreground mt-0.5 text-xs">{note}</p>
      </div>
      {state.kind === "ready" && (
        <Switch id="alerts-on-device" checked={state.on} disabled={busy} onCheckedChange={(v) => void onChange(v)} aria-label="Alerts on this device" />
      )}
    </div>
  );
}
