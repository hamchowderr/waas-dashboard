"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { HighLevelLink } from "@/lib/api/types";
import { checkHighLevel } from "../../actions";

/** A time in the viewer's own time zone: "2:05 PM" today, "Nov 8, 2:05 PM" before. */
function localTime(value: string): string {
  const date = new Date(value);
  const today = new Date().toDateString() === date.toDateString();
  return date.toLocaleString(undefined, today ? { hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const noSubscribe = () => () => {};

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="min-w-0 text-end break-words">{children}</span>
    </div>
  );
}

/**
 * A HighLevel site's link to its sub-account: which one, whether its WP Fusion is connected, when the site last
 * checked in, and "Check now", which has the site check at once instead of within the hour.
 */
export function HighLevelLinkPanel({
  tenantId,
  link,
  canCheck
}: {
  tenantId: string;
  link: HighLevelLink | null;
  canCheck: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  // Times are shown in the viewer's time zone, so only on their browser (the server renders "…").
  const mounted = React.useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false
  );
  const at = (value: string | null) => (value ? (mounted ? localTime(value) : "…") : "Never");

  const check = () =>
    startTransition(async () => {
      const result = await checkHighLevel(tenantId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { highLevel, wpFusionConnected } = result.data;
      if (!highLevel) toast.info("This site isn't tied to a HighLevel sub-account, so it sends no contacts.");
      else if (highLevel.connected && wpFusionConnected) toast.success(`Connected to ${highLevel.locationName ?? "the sub-account"}.`);
      else if (highLevel.connected) toast.warning("The site has the sub-account's token, but its WP Fusion is set up for another CRM.");
      else toast.warning("HighLevel gave no token for this sub-account. Check the AnyPress app is installed and approved there.");
      router.refresh();
    });

  const status = !link ? (
    <Badge variant="outline">Not tied</Badge>
  ) : link.connected ? (
    <Badge variant="success">Connected</Badge>
  ) : (
    <Badge variant="warning">Not connected yet</Badge>
  );

  return (
    <div className="space-y-3" data-testid="highlevel-link">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {!link
            ? "Not tied to a sub-account"
            : link.connected
              ? `Connected to ${link.locationName ?? "its sub-account"}`
              : "Tied, not connected yet"}
        </p>
        {status}
      </div>
      {link && (
        <>
          <Line label="Sub-account">
            {link.locationName && <span className="block">{link.locationName}</span>}
            <span className="text-muted-foreground font-mono text-xs">{link.locationId}</span>
          </Line>
          <Line label="Last checked">{at(link.lastCheckAt)}</Line>
          {link.connected && <Line label="Token given">{at(link.connectedAt)}</Line>}
        </>
      )}
      <p className="text-muted-foreground text-sm">
        {!link
          ? "Sites made by a sub-account's workflow are tied to it. This one sends its users nowhere."
          : link.connected
            ? "New users of this site go to the sub-account as contacts tagged “website user”. The site checks in every hour."
            : "The site checks in every hour. Check now asks it right away."}
      </p>
      {canCheck && (
        <Button variant="outline" size="sm" disabled={pending} onClick={check}>
          {pending ? <Spinner /> : <RefreshCwIcon />}
          Check now
        </Button>
      )}
    </div>
  );
}
