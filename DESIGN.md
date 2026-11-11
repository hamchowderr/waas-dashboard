---
name: AnyPress Dashboard
description: Operations dashboard for the AnyPress store-provisioning platform. The Studio look: one white page sheet beside a warm canvas.
colors:
  background: "#f3efea"
  foreground: "#1b1917"
  card: "#ffffff"
  primary: "#c8264d"
  primary-gradient: "linear-gradient(135deg, #dc2a55, #c8264d 55%, #a81e72)"
  primary-strong: "#c8264d"
  primary-foreground: "#ffffff"
  secondary: "#efeae4"
  muted: "#f6f3ef"
  muted-foreground: "#6f6962"
  step-ring: "#bdb4aa"
  border: "#ebe5de"
  input: "#e2dbd3"
  ring: "#c8264d"
  sidebar: "#f3efea"
  sidebar-accent: "#ffffff"
  dark-background: "#141210"
  dark-card: "#211e1b"
  dark-muted: "#292522"
  dark-primary: "#f0476f"
  status-ready: "green-600"
  status-pending: "amber-500"
  status-failed: "rose-600"
typography:
  headline:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    letterSpacing: "-0.03em"
  stat:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "1.875rem"
    fontWeight: 800
  title:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "1.05rem"
    fontWeight: 700
  body:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "0.75rem"
    fontWeight: 600
rounded:
  control: "999px"
  input: "12px"
  tile: "16px"
  sheet: "22px"
  card: "18px"
spacing:
  card: "22px"
  content: "24px"
  sidebar: "256px"
shadows:
  card: "0 1px 2px rgb(27 25 23 / 0.04), 0 10px 30px -12px rgb(27 25 23 / 0.14)"
  raised: "0 1px 2px rgb(27 25 23 / 0.06), 0 0 0 1px rgb(27 25 23 / 0.06)"
  primary-glow: "0 6px 16px -6px rgb(200 38 77 / 0.55)"
---

# Design System: AnyPress Dashboard

The look the owner picked on 2026-11-06 ("Studio", out of Sketchbook, Console and Studio). Tokens live in `app/globals.css`; components in `components/ui/` carry the shapes. When code and this file disagree, fix whichever is wrong and keep them matched.

## Overview

**Creative North Star: "The Studio"**

The sidebar sits on a warm, paper-coloured canvas and each page is one white sheet beside it, lifted off the canvas with a soft shadow (2026-11-11, replacing a field of white cards floating on the canvas). Inside the sheet, cards are quiet sections with a hairline edge, each led by a neutral round icon chip. Shapes are round and friendly (pill buttons, 22px panels, round icon chips), the type is Plus Jakarta Sans with heavy, tight headings, and the logo's ribbon pink is the colour of the main action on every page. It should feel like a calm, well-made product for website owners, not an admin console.

**Key characteristics:**
- Warm canvas (`background`) behind the sidebar, which has no panel of its own. The page area (`sidebar-inset`) is one white sheet: 22px radius and `shadow-card` from `md`, full white on phone.
- Cards inside the sheet: white, 1px `border` hairline, 18px radius, no shadow (`globals.css`, "The page sheet"). Cards outside the sheet (sign-in, tour) keep `shadow-card`.
- Every card header starts with a `CardIcon`: a neutral round chip (`muted` fill, `foreground/70` icon) with the icon that says what the section is about. A company's own logo (HighLevel, Zapier) sits in a white chip instead. Chips only take a status colour when the card is a status (a job running or failed, an error).
- Plugins show their logo (`PluginIcon`) wherever they are listed: the wordpress.org icons are kept in `public/plugins/` so they load with the page; a plugin without one gets a letter tile.
- Inside cards, grouped items are soft `muted` tiles (16px radius), not bordered boxes.
- Main buttons are pills with the ribbon gradient and a pink glow; other buttons are white pills with `shadow-raised`.
- Icons are lucide-react everywhere (sidebar, menus, cards), one stroke weight, no second icon set and no animated icons. Each page and each idea keeps one icon: Stores `PanelsTopLeft`, Storefronts `Store`, Backups `Archive`, Activity Log `ListChecks`, API Log `ScrollText`, Templates `Layers`, versions `GitBranch`.
- Same information on phone, reflowed into cards, never hidden.

## Colours

- **Canvas** `#f3efea` (`background`, `sidebar`): the page and the rail.
- **Panel** `#ffffff` (`card`, `popover`): every card, dialog, menu and input.
- **Tile** `#f6f3ef` (`muted`): rows and steps inside a card; hover fills.
- **Ink** `#1b1917` (`foreground`) and **Pencil** `#6f6962` (`muted-foreground`).
- **Ribbon** `#c8264d` (`primary`, `ring`) with `--primary-gradient` (`#dc2a55` to `#a81e72`; dark `#d63360` to `#a42479`) on main buttons, links, count pills and the active sidebar icon, and nowhere else. Every stop keeps white text at 4.5:1 or more. Dark mode uses `#f0476f` for ribbon text and links; `--primary-strong` (`#c8264d`, dark `#c42a5a`) is the ribbon behind white text such as count pills. One main (ribbon) button per page section; the rest are outline.
- **Charts** use the ribbon family: `chart-1..5` are pink, honey, magenta, orange and stone.
- **Status** stays semantic and is the only other colour: green = ready/done, amber = in progress or waiting (and warnings), rose = failed or stuck, neutral = queued, suspended, off. Badges (`components/ui/badge.tsx`) are tinted fills with a matching border, the same in both themes. Progress bars follow it: amber while moving, green when done, rose when stuck or failed. Warning notices are `amber-500/10` boxes with an amber border.
- **Status chips** (stat tiles, Needs you rows, job progress): `green-600/12`, `amber-500/15`, `rose-600/12` fills with the 700/800 shade as the icon colour (300 in dark mode). A tile that shows zero problems stays neutral.
- A seller's or reseller's brand colour (Branding page) or an Appearance accent replaces the ribbon: `--primary`, `--primary-strong`, a flat `--primary-gradient` and matching `--primary-glow` (`lib/branding.ts`, `lib/appearance.ts`). A brand with a name and no logo shows its first letter on a tile in that colour.

## Typography

Plus Jakarta Sans (variable, `lib/fonts.ts`, `--font-sans`) for everything; system mono for ids and keys.

- **Page title** (`PageHeader`): 800, 24px on phone and 32px from `lg`, -0.03em.
- **Stat numbers**: 800, 30px, tabular.
- **Card title**: 700, 17px, -0.015em.
- **Body**: 400, 14px. **Labels and table heads**: 600, 12px, muted.

## Layout

- **Shell:** inset sidebar on the canvas, 256px, collapsing to icons; off-canvas sheet on phone. The header has no rule under it.
- **Sidebar:** group headings 11.5px bold in `sidebar-foreground` (6.3:1 on the canvas); the sidebar is a `complementary` landmark holding the main `nav`; the active page is a white pill with `shadow-card`, bold text and a ribbon-coloured icon.
- **Overview:** page header with New site as its one main button (Take the tour is ghost), then four stat tiles (`StatTiles`, `muted` tiles on the sheet: Ready, In progress, Failed, Backups; 2 across on phone, 4 from `xl`), then a 2:1 row: "Needs you" and the setup checklists on the left, Recent activity (the last six tasks with their state) on the right, sticky on wide screens. The Failed tile counts exactly what Needs you lists. Setup checklists show the open steps first and fold the done ones under "N done".
- **Store page:** an open header on the sheet (site-type chip, name and status; Visit site, Log in to WordPress and a "…" menu with Email the owner, API log, then Suspend and Delete after a line) above a hairline, then two columns from `lg`: domains, what comes installed (a row of plugin logos, with what each does folded under it), backups and activity in the main column; the store's details, HighLevel, languages and email sender in a side column on the right. Each column stacks on its own, so neither leaves a gap. Below `lg` the main column comes first.
- **Card headers:** icon chip, title and description; an action sits on the right, and on a narrow card (under 28rem) a button moves to its own row under the text (`CardAction inline` keeps a small text link beside the title).
- **Loading:** `loading.tsx` on the Overview, Stores and store pages shows the page's shape (`PageSkeleton`), never a blank sheet.
- **Empty states:** `EmptyState` (round chip, title, one line) inside a card or an empty table, never a bare "None yet."
- **Lists:** one card per page with toolbar, table and pagination (`components/admin/data-table.tsx`). Tables show from `lg`; below that rows become cards.
- **Touch:** under `pointer: coarse` every control grows to 44px (unlayered rule in `globals.css`). Keep it. With a mouse every target is at least 24px (switches get an invisible hit area).

## Shapes and depth

- Buttons, tabs and badges: full pills. Inputs: 12px. Tiles: 16px. The page sheet: 22px. Cards and stat tiles: 18px. Icon chips: circles.
- Depth: `shadow-card` on the page sheet, `shadow-raised` on white buttons, `--primary-glow` under main buttons. Cards on the sheet have a hairline, not a shadow. No cards inside cards (use tiles).
- Stat tiles darken to `accent` on hover.

## Components

- **Buttons:** default = ribbon gradient pill, white text, glow, brighter on hover. Outline = white pill with `shadow-raised`. Ghost = no fill, `muted` on hover. Destructive stays a tint, never solid red.
- **Tabs:** `secondary` pill track, active segment a white pill.
- **Tables:** 12px semibold muted heads, hairline row rules, hover tint.
- **Setup steps:** `muted` tiles; open steps have a white circle with a firm 1.5px `step-ring` outline, done steps a solid green circle with a soft green halo.
- **Guided tour:** steps point at `data-tour-step-id`; keep those ids when moving things.

## Do's and Don'ts

- **Do** use the tokens (`bg-card`, `bg-muted`, `text-muted-foreground`, `shadow-card`), never raw greys or hex in pages.
- **Do** check light, dark and phone width for every change, with sample data (`WAAS_API_FIXTURES=1`).
- **Do** keep the Appearance panel and brand colours working: they change `--primary` and the gradient.
- **Don't** give cards on the sheet a shadow, or nest cards; use tiles.
- **Do** start a new card's header with its neutral icon chip.
- **Do** say "task" for background work (builds, backups, moves), never "job".
- **Don't** use status colours as decoration, or the ribbon for status or progress. No rainbow chips: a colour has to mean something.
- **Don't** add a second typeface.
- **Don't** hide table columns on phone; reflow them into row cards.
