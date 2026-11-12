"use client";

import * as React from "react";
import Link from "next/link";
import { BellIcon, CheckCheckIcon, CircleAlertIcon, CircleCheckIcon, InfoIcon } from "lucide-react";

import { loadNotifications, readNotifications } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertsToggle } from "@/components/shell/alerts-toggle";
import { formatAgo } from "@/lib/format";
import type { Notification, NotificationList } from "@/lib/api/types";
import { notificationHref } from "@/lib/notifications";
import { cn } from "@/lib/utils";

/** How often the bell asks for new notifications while the tab is open and visible. */
const POLL_MS = 60_000;

const LEVEL_ICON = {
  success: { Icon: CircleCheckIcon, className: "text-green-600 dark:text-green-400" },
  error: { Icon: CircleAlertIcon, className: "text-destructive" },
  info: { Icon: InfoIcon, className: "text-muted-foreground" }
} as const;

/**
 * The header's bell: what happened to the storefront's stores and versions (and, for the platform
 * admin, new applications and failed restore tests). Opening it marks everything read.
 */
export function NotificationBell({ showStorefront = false }: { showStorefront?: boolean }) {
  const [list, setList] = React.useState<NotificationList | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    const refresh = () =>
      loadNotifications()
        .then((result) => {
          if (!live) return;
          if (result.ok) {
            setList(result.data);
            setError(null);
          } else setError(result.error);
        })
        .catch(() => undefined);
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    const onRead = () => setList((current) => current && { ...current, unread: 0, items: current.items.map((n) => ({ ...n, unread: false })) });
    window.addEventListener(NOTIFICATIONS_READ, onRead);
    return () => {
      live = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(NOTIFICATIONS_READ, onRead);
    };
  }, []);

  function markRead() {
    if (!list || list.unread === 0) return;
    setList({ ...list, unread: 0, items: list.items.map((n) => ({ ...n, unread: false })) });
    void readNotifications().catch(() => undefined);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    // Opening shows which ones are new; closing clears them, as does Mark all as read.
    if (!next) markRead();
  }

  const unread = list?.unread ?? 0;
  const label = unread > 0 ? `Notifications, ${unread} new` : "Notifications";

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={label} data-tour-step-id="notifications">
          <BellIcon />
          {unread > 0 && (
            <span className="bg-primary-strong text-primary-foreground ring-card absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[0.6875rem] leading-none font-semibold tabular-nums ring-2">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      {/* A column the height of the room below the bell: header, alerts and footer keep their size and
          only the list scrolls, so a long list never runs under the alerts switch. */}
      <PopoverContent
        align="end"
        className="flex max-h-[min(36rem,var(--radix-popover-content-available-height))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden p-0"
      >
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-medium">Notifications</p>
          {unread > 0 && (
            <Button variant="ghost" size="xs" onClick={markRead} className="text-primary -me-2 font-medium">
              <CheckCheckIcon data-icon="inline-start" />
              Mark all as read
            </Button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-testid="notification-list">
          {error && !list ? (
            <p className="text-muted-foreground px-4 py-6 text-sm">{error}</p>
          ) : !list ? (
            <p className="text-muted-foreground px-4 py-6 text-sm">Loading…</p>
          ) : list.items.length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-sm">
              Nothing yet. When a store is ready, goes live or a task fails, it shows up here.
            </p>
          ) : (
            <ul className="divide-y">
              {list.items.map((n) => (
                <NotificationRow key={n.id} n={n} showStorefront={showStorefront} onPick={() => onOpenChange(false)} />
              ))}
            </ul>
          )}
        </div>
        <div className="shrink-0">
          <AlertsToggle />
        </div>
        <div className="text-muted-foreground flex shrink-0 items-center justify-between gap-3 border-t px-4 py-2 text-xs">
          <span>Kept for 30 days.</span>
          <Link href="/notifications" onClick={() => onOpenChange(false)} className="text-foreground font-medium underline-offset-4 hover:underline">
            See all and alert settings
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Sent on the window when notifications are marked read elsewhere on the page (the Notifications page). */
export const NOTIFICATIONS_READ = "anypress:notifications-read";

export function NotificationRow({ n, showStorefront, onPick }: { n: Notification; showStorefront: boolean; onPick?: () => void }) {
  const { Icon, className } = LEVEL_ICON[n.level] ?? LEVEL_ICON.info;
  const href = notificationHref(n);
  const body = (
    <div className={cn("flex min-h-11 gap-3 px-4 py-3", n.unread && "bg-muted/60")}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", className)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">{n.title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {formatAgo(n.at)}
          {showStorefront && n.productName ? ` · ${n.productName}` : ""}
        </p>
      </div>
      {n.unread && <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" aria-label="New" />}
    </div>
  );
  return (
    <li>
      {href ? (
        <Link href={href} onClick={onPick} className="hover:bg-muted focus-visible:bg-muted block outline-none">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}
