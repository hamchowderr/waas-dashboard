import { CalendarCheckIcon, GlobeIcon, GraduationCapIcon, LayersIcon, ShoppingBagIcon, WorkflowIcon, type LucideIcon } from "lucide-react";

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
  everything: { label: "Everything", icon: LayersIcon },
  highlevel: { label: "HighLevel site", icon: WorkflowIcon }
};

/**
 * The site types New site offers, with the plugins each turns on. A site needs one: without it every plugin of the
 * store template stays on. HighLevel is for an agency that runs its clients' CRM, forms and calendars in HighLevel.
 */
export const NEW_SITE_TYPES = ["website", "bookings", "online-store", "community", "everything", "highlevel"] as const;

export const NEW_SITE_TYPE_HELP: Record<(typeof NEW_SITE_TYPES)[number], string> = {
  website: "Pages, contact form, CRM and email marketing.",
  bookings: "Website, plus online booking, payments and a help desk.",
  "online-store": "Website, plus a shop, a help desk and affiliates.",
  community: "Website, plus a members' community, courses and payments.",
  everything: "Every plugin the template has.",
  highlevel: "Pages and SEO, with HighLevel's own plugin for forms, chat and calendars. No Fluent CRM, forms or shop."
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
        "bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-xl",
        !type.known && "text-muted-foreground",
        className
      )}>
      <type.icon className="size-4" aria-hidden />
      <span className="sr-only">{type.label}</span>
    </span>
  );
}
