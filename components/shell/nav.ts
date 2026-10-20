import {
  ActivityIcon,
  ArchiveIcon,
  GaugeIcon,
  HandshakeIcon,
  InboxIcon,
  KeyRoundIcon,
  LayersIcon,
  ListChecksIcon,
  StoreIcon,
  UsersIcon,
  WebhookIcon,
  type LucideIcon
} from "lucide-react";

/** adminOnly: shown to the platform admin only. */
export type NavLink = { title: string; href: string; icon: LucideIcon; adminOnly?: boolean };

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
      { title: "Applications", href: "/applications", icon: InboxIcon, adminOnly: true },
      { title: "Resellers", href: "/resellers", icon: HandshakeIcon, adminOnly: true },
      { title: "Versions & templates", href: "/versions", icon: LayersIcon },
      { title: "API keys", href: "/keys", icon: KeyRoundIcon },
      { title: "Team", href: "/team", icon: UsersIcon }
    ]
  }
];

/** The sidebar's groups for this viewer: customers don't see the platform admin's pages. */
export function navFor(isAdmin: boolean) {
  return NAV.map((group) => ({ ...group, links: group.links.filter((link) => isAdmin || !link.adminOnly) }));
}

/** A link is current on its own page and on pages below it (a store under Stores). */
export function isCurrent(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
