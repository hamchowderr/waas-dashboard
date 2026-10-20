import type { StoreDays } from "@/lib/api/types";

/** A calendar month (UTC) as YYYY-MM, its first instant and the next month's. */
export function monthRange(month: string | undefined, now = new Date()) {
  const match = /^(\d{4})-(\d{2})$/.exec(month ?? "");
  const year = match ? Number(match[1]) : now.getUTCFullYear();
  const index = match ? Number(match[2]) - 1 : now.getUTCMonth();
  const from = new Date(Date.UTC(year, index, 1));
  const to = new Date(Date.UTC(year, index + 1, 1));
  const key = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return {
    month: key(from),
    label: from.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
    from: from.toISOString(),
    to: to.toISOString(),
    previous: key(new Date(Date.UTC(year, index - 1, 1))),
    next: key(to)
  };
}

export const totalDays = (days: StoreDays) => Math.round((days.small + days.medium + days.large) * 100) / 100;

export const formatDays = (days: number) => days.toLocaleString("en-US", { maximumFractionDigits: 2 });
