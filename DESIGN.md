---
name: AnyPress Dashboard
description: Operations dashboard for the AnyPress store-provisioning platform. The Hosting look: white panels on a warm page, no borders, a whisper of shadow.
colors:
  background: "#f5f0ea"
  foreground: "#1b1917"
  card: "#ffffff"
  primary: "#c8264d"
  primary-strong: "#c8264d"
  primary-foreground: "#ffffff"
  muted: "#f3eee8"
  muted-foreground: "#6f6962"
  step-ring: "#bdb4aa"
  border: "#ebe5de"
  input: "#e2dbd3"
  ring: "#c8264d"
  sidebar: "#f5f0ea"
  dark-background: "#141210"
  dark-card: "#211e1b"
  dark-muted: "#292522"
  dark-primary: "#f0476f"
  status-ready: "green-600"
  status-pending: "amber-500"
  status-failed: "rose-600"
typography:
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 500
    letterSpacing: "-0.025em"
  stat:
    fontFamily: "Inter"
    fontSize: "1.875rem"
    fontWeight: 600
  title:
    fontFamily: "Inter"
    fontSize: "0.9375rem"
    fontWeight: 600
  body:
    fontFamily: "Inter"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "Inter"
    fontSize: "0.75rem"
    fontWeight: 600
rounded:
  panel: "5px"
  button: "5px"
  badge: "999px"
  site-type-icon: "8px"
spacing:
  card: "18px"
  content: "24px"
  sidebar: "256px"
shadows:
  whisper: "0 1px 2px rgb(60 40 20 / 0.06), 0 0 0 1px rgb(60 40 20 / 0.03)"
  dark-whisper: "0 0 0 1px rgb(255 255 255 / 0.04)"
---

# Design System: AnyPress Dashboard

The look the owner picked on 2026-11-11 ("7 Hosting", out of eight directions drawn from real hosting and SaaS dashboards: MyKinsta, Plausible, Stripe, Linear, Attio, Resend). Base tokens live in `app/globals.css`; the look's overrides are in `app/look.css` (unlayered, so they win over the components' Tailwind utilities); components in `components/ui/` carry the shapes. When code and this file disagree, fix whichever is wrong and keep them matched.

## Overview

**North star: a calm hosting control panel.** The sidebar and the page share one warm, paper-coloured background. Each section is a white panel with no border, lifted off the page by a "whisper" shadow (a hairline ring plus a 1px drop). Corners are small (5px), type is Inter, headings are medium weight rather than heavy, and the logo's ribbon pink is the colour of the main action and nothing else. Colour otherwise only means status. It should read like a well-made hosting product for website owners: quiet, data-first, nothing shouting.

**Key characteristics:**
- One warm background (`background`, `sidebar`) behind everything; no page sheet, no card borders. Panels (`card`) are white with `--whisper`.
- Cards have no icon chips: a card header is its title, a one-line description and, on the right, its action. A company's own logo (HighLevel, Zapier) or a plugin logo still shows, in a white chip.
- Plugins show their logo (`PluginIcon`) wherever they are listed; wordpress.org icons are kept in `public/plugins/` so they load with the page; a plugin without one gets a letter tile.
- The stat strip (`StatTiles`) is one white panel split into cells by faint rules, each with a number, a label and a small status icon beside the number.
- Icons are lucide-react everywhere, one stroke weight, no second icon set and no animated icons. Each page and each idea keeps one icon: Stores `PanelsTopLeft`, Storefronts `Store`, Backups `Archive`, Activity Log `ListChecks`, API Log `ScrollText`, Templates `Layers`, versions `GitBranch`.
- On a laptop or desktop every page fits on one screen (see Layout). On a phone the same information reflows into cards and the page scrolls; nothing is hidden.

## Colours

- **Page** `#f5f0ea` (`background`, `sidebar`): the page and the rail, one colour.
- **Panel** `#ffffff` (`card`, `popover`): every card, dialog, menu, input and outline button.
- **Tile** `#f3eee8` (`muted`): rows and steps inside a card, hover fills, outline badges.
- **Ink** `#1b1917` (`foreground`) and **Pencil** `#6f6962` (`muted-foreground`).
- **Rules** are `border` at 60% (`color-mix`) for table rows and the cells of the stat strip.
- **Ribbon** `#c8264d` (`primary`, `ring`) on main buttons, links, count pills and focus rings, and nowhere else. It is flat (no gradient, no glow). Dark mode uses `#f0476f` for ribbon text and links; `--primary-strong` is the ribbon behind white text such as count pills. One main button per page section; the rest are outline.
- **Charts** use the ribbon family: `chart-1..5` are pink, honey, magenta, orange and stone.
- **Status** is semantic and the only other colour: green = ready/done, amber = in progress or waiting (and warnings), rose = failed or stuck, neutral = queued, suspended, off. Badges (`components/ui/badge.tsx`) are tinted pills; outline badges are `muted` pills. Progress bars follow it: amber while moving, green when done, rose when stuck or failed. Warning notices are `amber-500/10` boxes with an amber border.
- **Status icons** (stat strip, Needs you rows, task progress) are coloured icons with no chip behind them: the 600/700 shade (300 in dark mode). A cell that shows zero problems stays neutral.
- A seller's or reseller's brand colour (Branding page) or an Appearance accent replaces the ribbon: `--primary` and `--primary-strong` (`lib/branding.ts`, `lib/appearance.ts`). A brand with a name and no logo shows its first letter on a tile in that colour.

## Typography

Inter (variable, `lib/fonts.ts`, `--font-inter`, set as `--font-sans` in `app/look.css`) for everything; system mono for ids and keys.

- **Page title** (`PageHeader`): 500, 30px, -0.025em.
- **Stat numbers**: 600, 30px, -0.02em, tabular.
- **Card title**: 600, 15px, -0.01em. **Card description**: 13px, muted.
- **Body**: 400, 14px. **Labels and table heads**: 600, 12px, muted. **Counts** next to tabs and filters: plain muted numbers, no pill.

## Layout

- **Shell:** inset sidebar on the page colour, 256px, collapsing to icons; off-canvas sheet on phone. The header is a translucent strip of the page colour with no rule under it.
- **Sidebar:** group headings in `sidebar-foreground`; the sidebar is a `complementary` landmark holding the main `nav`; the active page is a 7% ink tint with bold text.
- **One screen per page (laptop and up).** From 1024px wide and 576px tall, a page never scrolls as a whole:
  - A list page's table panel (`data-fit="table"` on the `DataTable` card) fills the space left under the header; its rows scroll inside it under a sticky header row (the "fits the screen" block in `app/globals.css`).
  - A page with several parts splits them into tabs with `PageTabs` (`components/admin/page-tabs.tsx`): a line of text tabs with plain counts, the open tab kept in `?tab=` so a link or reload opens it. Pages with tabs: Overview (Needs you, Setup), store page (Overview, Backups, Activity, What's installed, Settings), Templates (Versions, Templates, Plan starting points), Plugins (Your plugins, Add a plugin, Template plugins), Integrations (one per kind), Webhooks (Endpoints, Deliveries), Branding.
  - Check new pages at 1440x900; 1366x768 may scroll a little.
- **Overview:** page header with New site as its one main button, the stat strip (Ready, In progress, Failed tasks, Backups; 2 across on phone, 4 from `xl`), then a 2:1 row: Needs you and Setup tabs on the left, Recent activity (the last six tasks) on the right. The Failed cell counts exactly what Needs you lists. Setup checklists show the open steps first and fold the done ones under "N done".
- **Store page:** an open header (site-type icon, name and status; Visit site, Log in to WordPress and a "…" menu with Email the owner, API log, then Suspend and Delete after a line), then the tabs. "What comes installed" starts with the AnyPress theme and AnyPress Blocks side by side (the theme is hidden for sites that keep their own code).
- **Card headers:** title and description; an action sits on the right, and on a narrow card (under 28rem) a button moves to its own row under the text (`CardAction inline` keeps a small text link beside the title).
- **Forms that ask many things** (new reseller) are a survey: one question per step, lettered answers (A to D, keyboard too), and a summary with Change links before saving.
- **Loading:** `loading.tsx` on the Overview, Stores and store pages shows the page's shape (`PageSkeleton`), never a blank page.
- **Empty states:** `EmptyState` (icon, title, one line) inside a card or an empty table, never a bare "None yet."
- **Lists:** one card per page with toolbar, table and pagination (`components/admin/data-table.tsx`). Tables show from `lg`; below that rows become cards.
- **Touch:** under `pointer: coarse` every control grows to 44px (unlayered rule in `globals.css`). Keep it. With a mouse every target is at least 24px (switches get an invisible hit area).

## Shapes and depth

- Panels, stat strip and buttons: 5px corners. Badges: full pills. Site-type icons: 8px squares, white with the whisper.
- Depth: `--whisper` on panels, the stat strip, outline buttons and site-type icons, and nothing else. No borders on panels, no glow, no big shadows. No cards inside cards (use tiles or rows).
- Stat cells tint to `muted` on hover.

## Components

- **Buttons:** default = flat ribbon, white text. Outline = white with the whisper, no border. Ghost = no fill, `muted` on hover. Destructive stays a tint, never solid red.
- **Tabs:** page tabs are text with an underline on the open one (`variant="line"`); small in-card switches may use the pill track.
- **Tables:** 12px semibold muted heads, faint row rules, hover tint.
- **Setup steps:** rows with a white circle and a firm 1.5px `step-ring` outline when open, a solid green circle when done.
- **Guided tour:** steps point at `data-tour-step-id`; keep those ids when moving things.

## Do's and Don'ts

- **Do** use the tokens (`bg-card`, `bg-muted`, `text-muted-foreground`, `--whisper`), never raw greys or hex in pages.
- **Do** check light, dark and phone width for every change, with sample data (`WAAS_API_FIXTURES=1`), and that laptop pages still fit on one screen.
- **Do** keep the Appearance panel and brand colours working: they change `--primary`.
- **Don't** add borders or bigger shadows to panels, or icon chips to card headers.
- **Do** say "task" for background work (builds, backups, moves), never "job".
- **Don't** use status colours as decoration, or the ribbon for status or progress. No rainbow chips: a colour has to mean something.
- **Don't** add a second typeface.
- **Don't** hide table columns on phone; reflow them into row cards.
