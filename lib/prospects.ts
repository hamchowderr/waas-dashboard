import type { Prospect, ProspectContacts, SocialNetwork } from "@/lib/api/types";

const csvCell = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

const NETWORKS: [SocialNetwork, string][] = [
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["linkedin", "LinkedIn"],
  ["x", "X"],
  ["youtube", "YouTube"],
  ["tiktok", "TikTok"]
];

/** Prospects as a CSV a CRM can import, with what their websites said about reaching them. */
export function prospectsCsv(prospects: Prospect[], contacts: Record<string, ProspectContacts> = {}): string {
  const header = ["Name", "Type", "Phone", "Email", "Website", "Contact page", ...NETWORKS.map(([, label]) => label), "Address", "Rating", "Reviews", "Hours", "Google Maps"];
  const rows = prospects.map((p) => {
    const c = p.website ? contacts[p.website] : undefined;
    const social = (n: SocialNetwork) => c?.socials.find((s) => s.network === n)?.url ?? null;
    return [
      p.name,
      p.type,
      p.phone,
      c?.emails.join("; ") ?? null,
      p.website,
      c?.contactPage ?? null,
      ...NETWORKS.map(([n]) => social(n)),
      p.address,
      p.rating,
      p.reviews,
      p.hours?.join("; ") ?? null,
      p.mapsUrl
    ]
      .map(csvCell)
      .join(",");
  });
  return [header.join(","), ...rows].join("\n") + "\n";
}
