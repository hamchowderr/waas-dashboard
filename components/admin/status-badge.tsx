import { HourglassIcon, PauseCircleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { statusMeta } from "@/lib/format";
import type { StatusCode } from "@/lib/api/types";

export function StatusBadge({ statusCode }: { statusCode: StatusCode }) {
  const meta = statusMeta[statusCode];
  return (
    <Badge variant={meta.badge} className="whitespace-nowrap">
      {meta.label}
    </Badge>
  );
}

export function SuspendedBadge() {
  return (
    <Badge variant="outline" className="text-muted-foreground whitespace-nowrap">
      <PauseCircleIcon />
      Suspended
    </Badge>
  );
}

/** A site moved in that hasn't gone live yet: no scheduled tasks, email only to its owner, not indexed. */
export function OnHoldBadge() {
  return (
    <Badge variant="outline" className="text-muted-foreground whitespace-nowrap">
      <HourglassIcon />
      On hold
    </Badge>
  );
}
