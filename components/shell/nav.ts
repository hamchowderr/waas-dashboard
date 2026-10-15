import {
  ActivityIcon,
  ArchiveIcon,
  GaugeIcon,
  KeyRoundIcon,
  LayersIcon,
  ListChecksIcon,
  StoreIcon,
  UsersIcon,
  WebhookIcon,
  type LucideIcon
} from "lucide-react";

export type NavLink = { title: string; href: string; icon: LucideIcon };

/** Every page in the sidebar and in the ⌘K search, grouped as the sidebar shows them. */
export const NAV: { title: string; links: NavLink[] }[] = [
  {
    title: "Operations",
    links: [
      { title: "Overview", href: "/", icon: GaugeIcon },
      { title: "Stores", href: "/stores", icon: StoreIcon },
      { title: "Jobs", href: "/jobs", icon: ListChecksIcon },
      { title: "Backups", href: "/backups", icon: ArchiveIcon },
      { title: "Requests", href: "/requests", icon: ActivityIcon },
      { title: "Webhooks", href: "/webhooks", icon: WebhookIcon }
    ]
  },
  {
    title: "Storefronts",
    links: [
      { title: "Versions & templates", href: "/versions", icon: LayersIcon },
      { title: "API keys", href: "/keys", icon: KeyRoundIcon },
      { title: "Team", href: "/team", icon: UsersIcon }
    ]
  }
];

/** A link is current on its own page and on pages below it (a store under Stores). */
export function isCurrent(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
