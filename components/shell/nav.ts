import {
  ActivityIcon,
  BellIcon,
  ArchiveIcon,
  GaugeIcon,
  HandshakeIcon,
  InboxIcon,
  KeyRoundIcon,
  LayersIcon,
  MegaphoneIcon,
  ListChecksIcon,
  BlocksIcon,
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
export type NavLink = {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  adminOnly?: boolean;
  resellerOnly?: boolean;
  global?: boolean;
};

/**
 * Every page, in the groups the sidebar shows them in (a small heading over each group; Overview has none). Every
 * page is its own sidebar link, named in Title Case, so nothing hides behind tabs. ⌘K search lists every page.
 * `description` says what the page is for: the sidebar shows it on hover, and search shows it under the name.
 */
export type NavSection = { title: string; icon: LucideIcon; links: NavLink[] };

export const NAV: NavSection[] = [
  {
    title: "Overview",
    icon: GaugeIcon,
    links: [{ title: "Overview", href: "/", icon: GaugeIcon, description: "What needs you today" }]
  },
  {
    title: "Websites",
    icon: StoreIcon,
    links: [
      { title: "Stores", href: "/stores", icon: StoreIcon, description: "Every customer website, its status and address" },
      { title: "Backups", href: "/backups", icon: ArchiveIcon, description: "Saved copies of each store, to restore" },
      { title: "Activity Log", href: "/jobs", icon: ListChecksIcon, description: "Every task run on a store, and any that failed" }
    ]
  },
  {
    title: "Store Setup",
    icon: LayersIcon,
    links: [
      { title: "Templates", href: "/versions", icon: LayersIcon, description: "The site new stores start from, and its versions" },
      { title: "Plugins", href: "/plugins", icon: PlugIcon, description: "Plugins your stores get on top of the template" }
    ]
  },
  {
    title: "Selling",
    icon: MegaphoneIcon,
    links: [
      { title: "Sales Kit", href: "/sell", icon: MegaphoneIcon, description: "Where to find customers, what to say and what to charge" }
    ]
  },
  {
    title: "Accounts",
    icon: ShoppingBagIcon,
    links: [
      { title: "Storefronts", href: "/storefronts", icon: ShoppingBagIcon, adminOnly: true, global: true, description: "Every seller and reseller shop" },
      { title: "Applications", href: "/applications", icon: InboxIcon, adminOnly: true, global: true, description: "People asking to sell, waiting for an answer" },
      { title: "Resellers", href: "/resellers", icon: HandshakeIcon, adminOnly: true, global: true, description: "Partners with several storefronts and one bill" },
      { title: "Reseller Account", href: "/reseller", icon: HandshakeIcon, resellerOnly: true, global: true, description: "Your bill, storefronts, invoices and partner keys" }
    ]
  },
  {
    title: "Settings",
    icon: UsersIcon,
    links: [
      { title: "Notifications", href: "/notifications", icon: BellIcon, global: true, description: "Everything the bell shows, and alerts on your phone or computer" },
      { title: "Team", href: "/team", icon: UsersIcon, description: "Who can sign in, and what each person may change" },
      { title: "Branding", href: "/branding", icon: PaletteIcon, description: "Your name, logo and colour on this dashboard and emails" }
    ]
  },
  {
    title: "Developers",
    icon: KeyRoundIcon,
    links: [
      { title: "Integrations", href: "/integrations", icon: BlocksIcon, description: "n8n, Zapier, Make, HighLevel, AI apps and the API, with how-to guides" },
      { title: "API Keys", href: "/keys", icon: KeyRoundIcon, description: "Keys that let your shop or an automation make stores" },
      { title: "Webhooks", href: "/webhooks", icon: WebhookIcon, description: "Tell other apps when something happens to a store" },
      { title: "API Log", href: "/requests", icon: ActivityIcon, description: "Every call made to the API, kept 30 days" }
    ]
  }
];

/** Every link in the sidebar, flat. */
export const ALL_LINKS = NAV.flatMap((section) => section.links);

/**
 * The groups for this viewer: customers don't see the platform admin's pages, only a reseller's team sees its
 * Reseller Account, and a group left empty goes.
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
