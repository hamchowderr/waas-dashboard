import type { ApplicationStatus } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";

const LABELS: Record<ApplicationStatus, string> = { pending: "Waiting", approved: "Approved", declined: "Declined" };

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={status === "pending" ? "default" : status === "approved" ? "secondary" : "outline"}>{LABELS[status]}</Badge>;
}
