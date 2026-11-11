---
name: AnyPress Dashboard
description: Operations dashboard for the AnyPress store-provisioning platform. The Studio look: one white page sheet beside a warm canvas.
colors:
  background: "#f3efea"
  foreground: "#1b1917"
  card: "#ffffff"
  primary: "#c8264d"
  primary-gradient: "linear-gradient(135deg, #ee2f5e, #c8264d 55%, #a81e72)"
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
  dark-card: "#1f1c19"
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

The sidebar sits on a warm, paper-coloured canvas and each page is one white sheet beside it, lifted off the canvas with a soft shadow (2026-11-11, replacing a field of white cards floating on the canvas). Inside the sheet, cards are quiet sections with a hairline edge, each led by a tinted icon chip. Shapes are round and friendly (pill buttons, 22px panels, round icon chips), the type is Plus Jakarta Sans with heavy, tight headings, and the logo's ribbon pink is the colour of the main action on every page. It should feel like a calm, well-made product for website owners, not an admin console.

**Key characteristics:**
- Warm canvas (`background`) behind the sidebar, which has no panel of its own. The page area (`sidebar-inset`) is one white sheet: 22px radius and `shadow-card` from `md`, full white on phone.
- Cards inside the sheet: white, 1px `border` hairline, 18px radius, no shadow (`globals.css`, "The page sheet"). Cards outside the sheet (sign-in, tour) keep `shadow-card`.
- Every card header starts with a `CardIcon`: a round tinted chip (ribbon, violet, sky, teal, orange, stone) saying what the section is about.
- Plugins show their wordpress.org logo (`PluginIcon`) wherever they are listed.
- Inside cards, grouped items are soft `muted` tiles (16px radius), not bordered boxes.
- Main buttons are pills with the ribbon gradient and a pink glow; other buttons are white pills with `shadow-raised`.
- Icons sit in round, softly tinted chips whose colour says what kind of thing it is.
- Same information on phone, reflowed into cards, never hidden.

## Colours

- **Canvas** `#f3efea` (`background`, `sidebar`): the page and the rail.
- **Panel** `#ffffff` (`card`, `popover`): every card, dialog, menu and input.
- **Tile** `#f6f3ef` (`muted`): rows and steps inside a card; hover fills.
- **Ink** `#1b1917` (`foreground`) and **Pencil** `#6f6962` (`muted-foreground`).
- **Ribbon** `#c8264d` (`primary`, `ring`) with `--primary-gradient` (`#ee2f5e` to `#a81e72`) on main buttons, progress bars, links and the active sidebar icon. Dark mode uses `#f0476f`.
- **Charts** use the ribbon family: `chart-1..5` are pink, honey, magenta, orange and stone.
- **Status** stays semantic: green = ready/done, amber = in progress, rose = failed, stone = suspended. Status badges keep the tinted-border style from `components/ui/badge.tsx`.
- **Tinted chips** (Overview, store icons): `green-600/12`, `amber-500/15`, `rose-600/12`, `fuchsia-600/10` fills with the 700 shade as the icon colour (300 in dark mode).
- A seller's or reseller's brand colour (Branding page) or an Appearance accent replaces the ribbon: `--primary` plus a flat `--primary-gradient` and matching `--primary-glow` (`lib/branding.ts`, `lib/appearance.ts`).

## Typography

Plus Jakarta Sans (variable, `lib/fonts.ts`, `--font-sans`) for everything; system mono for ids and keys.

- **Page title** (`PageHeader`): 800, 24px on phone and 32px from `lg`, -0.03em.
- **Stat numbers**: 800, 30px, tabular.
- **Card title**: 700, 17px, -0.015em.
- **Body**: 400, 14px. **Labels and table heads**: 600, 12px, muted.

## Layout

- **Shell:** inset sidebar on the canvas, 256px, collapsing to icons; off-canvas sheet on phone. The header has no rule under it.
- **Sidebar:** group headings 11.5px bold muted; the active page is a white pill with `shadow-card`, bold text and a ribbon-coloured icon.
- **Overview:** page header, then four stat tiles (`muted` tiles on the sheet) (Live, Being built, Need a look, Backups; 2 across on phone, 4 from `xl`), then a 2:1 row: "Needs you" and the setup checklists on the left, a Stores ring chart on the right (sticky on wide screens). Setup checklists show the open steps first and fold the done ones under "N done".
- **Store page:** an open header on the sheet (site-type chip, name, status and every action) above a hairline, then two columns from `lg`: domains, what comes installed (plugin tiles with logos, two across), backups and activity in the main column; the store's details, HighLevel, languages and email sender in a side column on the right. Each column stacks on its own, so neither leaves a gap. On phone the side column comes first.
- **Card headers:** icon chip, title and description; an action sits on the right, and on a narrow card (under 28rem) a button moves to its own row under the text (`CardAction inline` keeps a small text link beside the title).
- **Lists:** one card per page with toolbar, table and pagination (`components/admin/data-table.tsx`). Tables show from `lg`; below that rows become cards.
- **Touch:** under `pointer: coarse` every control grows to 44px (unlayered rule in `globals.css`). Keep it.

## Shapes and depth

- Buttons, tabs and badges: full pills. Inputs: 12px. Tiles: 16px. The page sheet: 22px. Cards and stat tiles: 18px. Icon chips: circles.
- Depth: `shadow-card` on the page sheet, `shadow-raised` on white buttons, `--primary-glow` under main buttons. Cards on the sheet have a hairline, not a shadow. No cards inside cards (use tiles).
- Stat tiles lift 2px on hover (not under reduced motion).

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
- **Do** start a new card's header with its icon chip.
- **Don't** use status colours as decoration, or the ribbon for status.
- **Don't** add a second typeface.
- **Don't** hide table columns on phone; reflow them into row cards.
