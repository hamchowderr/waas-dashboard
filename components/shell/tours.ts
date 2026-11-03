import type { Step, Tour } from "@/components/ui/tour";

/**
 * The guided tour, one per kind of account. Each step points at an element by its data-tour-step-id (a
 * space-separated list, so one element can serve several steps): the sidebar (`sidebar-nav`, each group
 * `group-<group>`, each link `nav-<page>`), the storefront picker in the header, the account menu at the bottom of
 * the sidebar, and a few cards and buttons on the pages. A step on another page carries the route to it.
 */
export type TourKind = "admin" | "seller" | "reseller";

/** The id a tour runs under, and the key that remembers it has been shown in this browser. */
export const tourId = (kind: TourKind) => `dashboard-${kind}`;

/** A title as it appears in the tour's element ids: "Store Setup" is store-setup. */
export const sectionSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

type Options = {
  kind: TourKind;
  /** The storefront picked in the header (?product=), kept on the pages the tour opens. */
  product: string | null;
  /** False for a "Can view" member: no step about buttons they can't use. */
  canChange: boolean;
};

export function tourFor({ kind, product, canChange }: Options): Tour {
  const at = (href: string) => (product ? `${href}?product=${encodeURIComponent(product)}` : href);
  const admin = kind === "admin";

  // Each page the tour visits, in order, with its steps. Routes between pages are filled in below.
  const pages: { href: string; steps: Step[] }[] = [
    {
      href: at("/"),
      steps: [
        admin
          ? {
              id: "needs-you",
              title: "Start here every day",
              content:
                "This list shows only what needs you: failed tasks, failed backups and seller applications to review. Each row has a button that fixes or opens it. When it's empty, nothing needs you.",
              side: "bottom",
              align: "start"
            }
          : {
              id: "start-here",
              title: "Welcome to your dashboard",
              content:
                "These are the first things to do: make a store, invite your team, add your brand and connect your shop. Each one opens the page where you do it.",
              side: "bottom",
              align: "start"
            },
        {
          id: "sidebar-nav",
          title: "Find your way around",
          content: "Every page is in the sidebar, in small groups. Hover over a link to see what it is for. On a phone, the button at the top left opens the sidebar.",
          side: "right",
          align: "start"
        },
        ...(admin
          ? [
              {
                id: "storefront-picker",
                title: "Pick a storefront",
                content:
                  "Every storefront that sells stores is here, AnyPress included. Pick one to see only its stores, designs and keys, or All storefronts to see everything.",
                side: "bottom",
                align: "start"
              } satisfies Step
            ]
          : [])
      ]
    },
    {
      href: at("/stores"),
      steps: [
        {
          id: "group-websites",
          title: "Your stores",
          content:
            "Stores lists every website, with its status and address. Backups has each store's saved copies, and Activity Log shows every task run on a store, including any that failed.",
          side: "right",
          align: "start"
        },
        ...(canChange
          ? [
              {
                id: "store-actions",
                title: "Add a store",
                content: "Create a new site from your template, or move an existing WordPress site in with an import code.",
                side: "bottom",
                align: "end"
              } satisfies Step
            ]
          : [])
      ]
    },
    {
      href: at("/versions"),
      steps: [
        {
          id: "group-store-setup",
          title: "Store setup",
          content:
            "Templates is the site every new store starts from. Each change to it is a new version, and the one marked Production is what new stores get. Plugins adds plugins on top, or switches template plugins off.",
          side: "right",
          align: "start"
        }
      ]
    },
    ...(admin
      ? [
          {
            href: "/storefronts",
            steps: [
              {
                id: "group-accounts",
                title: "Sellers and resellers",
                content:
                  "Storefronts are the shops that sell stores. Applications are people asking to sell, waiting for your answer. Resellers are partners who run several storefronts and get one monthly bill.",
                side: "right",
                align: "start"
              } satisfies Step
            ]
          }
        ]
      : []),
    ...(kind === "reseller"
      ? [
          {
            href: "/reseller",
            steps: [
              {
                id: "nav-reseller-account",
                title: "Your reseller account",
                content: "Your monthly bill, your storefronts (add one for each brand you sell under), past invoices and your partner keys are here.",
                side: "right",
                align: "start"
              } satisfies Step
            ]
          }
        ]
      : []),
    ...(admin
      ? []
      : [
          {
            href: at("/team"),
            steps: [
              {
                id: "group-settings",
                title: "Your settings",
                content:
                  "Invite the people who work with you and choose who can change things and who can only look. Branding puts your own name, logo and color on this dashboard.",
                side: "right",
                align: "start"
              } satisfies Step
            ]
          }
        ]),
    {
      href: at("/keys"),
      steps: [
        {
          id: "group-developers",
          title: "Connect your shop",
          content:
            "API Keys let your shop or an automation create stores. Webhooks tell other apps when a store is ready, and API Log shows every call that came in.",
          side: "right",
          align: "start"
        },
        {
          id: "account-menu",
          title: "That's the tour",
          content: "Your account menu is here at the bottom: Team, Branding, Appearance, dark mode, help and sign out. You can take the tour again from it too.",
          side: "right",
          align: "end"
        }
      ]
    }
  ];

  // A step that leaves its page links to the next page, and the first step on a page links back to the last one.
  const steps: Step[] = [];
  pages.forEach((page, p) => {
    page.steps.forEach((step, s) => {
      const lastOnPage = s === page.steps.length - 1;
      steps.push({
        ...step,
        ...(lastOnPage && pages[p + 1] ? { nextRoute: pages[p + 1].href } : {}),
        ...(s === 0 && p > 0 ? { previousRoute: pages[p - 1].href } : {})
      });
    });
  });

  return { id: tourId(kind), steps };
}
