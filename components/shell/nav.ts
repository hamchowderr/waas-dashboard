import {
  ActivityIcon,
  ArchiveIcon,
  GaugeIcon,
  HandshakeIcon,
  InboxIcon,
  KeyRoundIcon,
  LayersIcon,
  ListChecksIcon,
  PaletteIcon,
  PlugIcon,
  ShoppingBagIcon,
  StoreIcon,
  UsersIcon,
  WebhookIcon,
  type LucideIcon
} from "lucide-react";

/**
 * adminOnly: shown to the platform admin only. resellerOnly: shown to a reseller's own team only.
 * global: a page about every storefront at once, so links to it don't carry the storefront picked in the header.
 */
export type NavLink = { title: string; href: string; icon: LucideIcon; adminOnly?: boolean; resellerOnly?: boolean; global?: boolean };

/**
 * Every page, in the sections the sidebar shows: one sidebar link per section, and the section's pages as tabs at
 * the top of each of them (components/shell/section-tabs.tsx). ⌘K search lists every page.
 */
export type NavSection = { title: string; icon: LucideIcon; links: NavLink[] };

export const NAV: NavSection[] = [
  { title: "Overview", icon: GaugeIcon, links: [{ title: "Overview", href: "/", icon: GaugeIcon }] },
  {
    title: "Stores",
    icon: StoreIcon,
    links: [
      { title: "Stores", href: "/stores", icon: StoreIcon },
      { title: "Backups", href: "/backups", icon: ArchiveIcon },
      { title: "Activity", href: "/jobs", icon: ListChecksIcon }
    ]
  },
  {
    title: "Store designs",
    icon: LayersIcon,
    links: [
      { title: "Store designs", href: "/versions", icon: LayersIcon },
      { title: "Plugins", href: "/plugins", icon: PlugIcon }
    ]
  },
  {
    title: "Accounts",
    icon: ShoppingBagIcon,
    links: [
      { title: "Storefronts", href: "/storefronts", icon: ShoppingBagIcon, adminOnly: true, global: true },
      { title: "Applications", href: "/applications", icon: InboxIcon, adminOnly: true, global: true },
      { title: "Resellers", href: "/resellers", icon: HandshakeIcon, adminOnly: true, global: true }
    ]
  },
  {
    title: "Reseller account",
    icon: HandshakeIcon,
    links: [{ title: "Reseller account", href: "/reseller", icon: HandshakeIcon, resellerOnly: true, global: true }]
  },
  {
    title: "Team and brand",
    icon: UsersIcon,
    links: [
      { title: "Team", href: "/team", icon: UsersIcon },
      { title: "Branding", href: "/branding", icon: PaletteIcon }
    ]
  },
  {
    title: "Developers",
    icon: KeyRoundIcon,
    links: [
      { title: "API keys", href: "/keys", icon: KeyRoundIcon },
      { title: "Webhooks", href: "/webhooks", icon: WebhookIcon },
      { title: "API log", href: "/requests", icon: ActivityIcon }
    ]
  }
];

/**
 * The sections for this viewer: customers don't see the platform admin's pages, only a reseller's team sees its
 * Reseller account, and a section left empty goes.
 */
export function navFor(isAdmin: boolean, isReseller = false) {
  const shown = (link: NavLink) => (link.adminOnly ? isAdmin : link.resellerOnly ? isReseller && !isAdmin : true);
  return NAV.map((group) => ({ ...group, links: group.links.filter(shown) })).filter((group) => group.links.length > 0);
}

/** A link's address, keeping the storefront picked in the header (?product=) unless the page is about all of them. */
export function linkHref(link: NavLink, product: string | null): string {
  return product && !link.global ? `${link.href}?product=${encodeURIComponent(product)}` : link.href;
}

/** A link is current on its own page and on pages below it (a store under Stores). */
export function isCurrent(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** The section a page belongs to, with only the pages this viewer may see; null for a page outside the sidebar. */
export function sectionOf(pathname: string, isAdmin: boolean, isReseller = false): NavSection | null {
  return navFor(isAdmin, isReseller).find((section) => section.links.some((link) => isCurrent(pathname, link.href))) ?? null;
}
