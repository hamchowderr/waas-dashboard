import { Badge } from "@/components/ui/badge";
import type { JobState } from "@/lib/api/types";

const meta: Record<JobState, { label: string; badge: "info" | "warning" | "destructive" }> = {
  queued: { label: "Queued", badge: "warning" },
  active: { label: "Running", badge: "info" },
  failed: { label: "Failed", badge: "destructive" }
};

export function JobStateBadge({ state }: { state: JobState }) {
  return (
    <Badge variant={meta[state].badge} className="whitespace-nowrap">
      {meta[state].label}
    </Badge>
  );
}
