import { PauseCircleIcon } from "lucide-react";

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
