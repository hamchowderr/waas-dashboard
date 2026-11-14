import { Badge } from "@/components/ui/badge";
import type { JobState } from "@/lib/api/types";

const meta: Record<JobState, { label: string; badge: "info" | "warning" | "destructive" | "success" | "outline" }> = {
  queued: { label: "Queued", badge: "outline" },
  running: { label: "Running", badge: "warning" },
  failed: { label: "Failed", badge: "destructive" },
  retried: { label: "Retried", badge: "outline" },
  dismissed: { label: "Dismissed", badge: "outline" },
  done: { label: "Done", badge: "success" },
  cancelled: { label: "Cancelled", badge: "outline" }
};

export function JobStateBadge({ state }: { state: JobState }) {
  return (
    <Badge variant={meta[state].badge} className="whitespace-nowrap">
      {meta[state].label}
    </Badge>
  );
}
