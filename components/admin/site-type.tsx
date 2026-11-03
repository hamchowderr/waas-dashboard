import { CalendarCheckIcon, GlobeIcon, GraduationCapIcon, LayersIcon, ShoppingBagIcon, type LucideIcon } from "lucide-react";

import { cn } from "cn";

/**
 * What a store was sold as: the site types in the store template's roles.json, as the storefront sends them.
 * A store with none (moved in from another host, or made before the API kept it) shows as "Other site".
 */
const SITE_TYPES: Record<string, { label: string; icon: LucideIcon }> = {
  website: { label: "Website", icon: GlobeIcon },
  bookings: { label: "Bookings", icon: CalendarCheckIcon },
  "online-store": { label: "Store", icon: ShoppingBagIcon },
  store: { label: "Store", icon: ShoppingBagIcon },
  community: { label: "Community & courses", icon: GraduationCapIcon },
  everything: { label: "Everything", icon: LayersIcon }
};

const OTHER = { label: "Other site", icon: GlobeIcon };

/** The store's main site type: the first one the dashboard knows. */
export function siteTypeOf(siteTypes: string[]): { label: string; icon: LucideIcon; known: boolean } {
  for (const type of siteTypes) {
    const found = SITE_TYPES[type];
    if (found) return { ...found, known: true };
  }
  return { ...OTHER, known: false };
}

/** The type's icon in a small square, as on the store rows. */
export function SiteTypeIcon({ siteTypes, className }: { siteTypes: string[]; className?: string }) {
  const type = siteTypeOf(siteTypes);
  return (
    <span
      title={type.label}
      className={cn(
        "bg-muted flex size-8 shrink-0 items-center justify-center rounded-md border",
        !type.known && "text-muted-foreground",
        className
      )}>
      <type.icon className="size-4" aria-hidden />
      <span className="sr-only">{type.label}</span>
    </span>
  );
}
