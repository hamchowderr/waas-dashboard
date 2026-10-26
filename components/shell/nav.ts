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
 * Every page in the sidebar and in the ⌘K search, grouped as the sidebar shows them: the stores themselves,
 * the accounts that sell them (platform admin), how a storefront's stores are set up, and what developers use.
 */
export const NAV: { title: string; links: NavLink[] }[] = [
  {
    title: "Stores",
    links: [
      { title: "Overview", href: "/", icon: GaugeIcon },
      { title: "Stores", href: "/stores", icon: StoreIcon },
      { title: "Backups", href: "/backups", icon: ArchiveIcon },
      { title: "Activity", href: "/jobs", icon: ListChecksIcon }
    ]
  },
  {
    title: "Accounts",
    links: [
      { title: "Applications", href: "/applications", icon: InboxIcon, adminOnly: true, global: true },
      { title: "Storefronts", href: "/storefronts", icon: ShoppingBagIcon, adminOnly: true, global: true },
      { title: "Resellers", href: "/resellers", icon: HandshakeIcon, adminOnly: true, global: true },
      { title: "Reseller account", href: "/reseller", icon: HandshakeIcon, resellerOnly: true, global: true }
    ]
  },
  {
    title: "Storefront setup",
    links: [
      { title: "Store designs", href: "/versions", icon: LayersIcon },
      { title: "Plugins", href: "/plugins", icon: PlugIcon },
      { title: "Team", href: "/team", icon: UsersIcon },
      { title: "Branding", href: "/branding", icon: PaletteIcon }
    ]
  },
  {
    title: "Developers",
    links: [
      { title: "API keys", href: "/keys", icon: KeyRoundIcon },
      { title: "Webhooks", href: "/webhooks", icon: WebhookIcon },
      { title: "API log", href: "/requests", icon: ActivityIcon }
    ]
  }
];

/**
 * The sidebar's groups for this viewer: customers don't see the platform admin's pages, only a reseller's team
 * sees its Reseller account, and a group left empty goes.
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
