import type { Prospect } from "@/lib/api/types";

const csvCell = (v: string | number | null) => (v === null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

/** Prospects as a CSV a CRM can import. */
export function prospectsCsv(prospects: Prospect[]): string {
  const rows = prospects.map((p) => [p.name, p.phone, p.website, p.address, p.rating, p.reviews, p.mapsUrl].map(csvCell).join(","));
  return ["Name,Phone,Website,Address,Rating,Reviews,Google Maps", ...rows].join("\n") + "\n";
}
