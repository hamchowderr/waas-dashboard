---
name: AnyPress Dashboard
description: Operations dashboard for the AnyPress store-provisioning platform. Quiet, neutral, data-first.
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  card: "oklch(1 0 0)"
  primary: "oklch(0.205 0 0)"
  primary-foreground: "oklch(0.985 0 0)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  border: "oklch(0.922 0 0)"
  ring: "oklch(0.708 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
  sidebar: "oklch(97.391% 0.00104 11.32)"
  sidebar-foreground: "oklch(50.323% 0.00006 271.152)"
  sidebar-accent: "oklch(90.975% 0.0001 271.152)"
  dark-background: "oklch(0.145 0 0)"
  dark-card: "oklch(0.205 0 0)"
  dark-muted: "oklch(0.269 0 0)"
  dark-border: "oklch(1 0 0 / 10%)"
  status-ready: "oklch(62.7% 0.194 149.214)"
  status-pending: "oklch(70.5% 0.213 47.604)"
  status-info: "oklch(62.3% 0.214 259.815)"
  status-failed: "oklch(58.6% 0.253 17.585)"
typography:
  headline:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    letterSpacing: "-0.025em"
  stat:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
  title:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.375
  body:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.75rem"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  pill: "26px"
spacing:
  card: "16px"
  card-sm: "12px"
  content: "24px"
  header: "56px"
  sidebar: "256px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "4px 10px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card}"
  badge:
    rounded: "{rounded.pill}"
    height: "20px"
    padding: "2px 8px"
    typography: "{typography.label}"
  tabs-list:
    backgroundColor: "{colors.muted}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "3px"
---

# Design System: AnyPress Dashboard

This file pins the dashboard's look as the authority. Changes must keep pages visually consistent with the screenshots in `docs/screenshots/`. When code and this file disagree, the current rendered UI wins and this file gets corrected.

## Overview

**Creative North Star: "The Quiet Control Room"**

A calm, monochrome operations console. Everything structural (surfaces, text, borders, buttons) is neutral grey on white (or near-black in dark mode); the only color on screen is *meaning*: a store is ready, pending, removing, or failed. The owner's brief is "incredibly clean, just like what we have", so the job is preservation, not reinvention.

Density is moderate: 14px body text, 32px controls, generous 24px page padding, and hairline borders instead of shadows. Pages follow one rhythm: a bold page title with a one-line muted summary, then cards.

The default theme is canonical. The Appearance panel (palette icon in the header) offers accent colors, chart colors, fonts, radius, text size, page width and sidebar style (`lib/appearance.ts`, `components/shell/appearance-panel.tsx`); those controls must keep working, but nothing new should be designed against them. Default = every setting on Default, sidebar `inset` + collapsible to `icon`, page width `full`, font DM Sans, light mode.

**Key Characteristics:**
- Neutral oklch greyscale (zero chroma) for all chrome; color only for status.
- One font (DM Sans) for everything; system mono for IDs and job type keys.
- Flat: 1px borders and soft rings, no decorative shadows, no gradients.
- Rounded but not bubbly: 10px controls, 14px cards, pill badges.
- Same information on phone, reflowed into cards, never hidden.

## Colors

A zero-chroma neutral system (shadcn "neutral" base) with a small set of status hues borrowed from the Tailwind palette.

### Primary
- **Ink** (`primary`): primary buttons, active pagination, logo tile. Near-black in light mode; flips to light grey `oklch(0.922 0 0)` in dark mode.

### Neutral
- **Paper** (`background`, `card`): page canvas and cards are the same white; cards separate by border, not fill.
- **Graphite** (`foreground`): all primary text.
- **Fog** (`muted`): tab-list track, hover fills, the inner "Open" strip on stat cards, info notes (`muted/50` with border).
- **Pencil** (`muted-foreground`): descriptions, column values that are secondary (dates, "—"), table row-card labels.
- **Hairline** (`border`): every divider, table row rule, card ring (`foreground/10`).
- **Sidebar Mist** (`sidebar`): the slightly warm off-white rail behind the inset content panel; active nav item uses `sidebar-accent`.
- **Dark mode**: canvas `dark-background`, cards/sidebar `dark-card`, fills `dark-muted`, borders white at 10%. Same structure, inverted.

### Status hues (semantic only)
- **Ready / Done / Operational** (`status-ready`, green): green-400 border, green-50 fill, green-800 text in badges; green-600 dots and bars (green-400 in dark).
- **Pending / Queued** (`status-pending`, orange): orange-400 / orange-50 / orange-800.
- **Removing / Running** (`status-info`, blue): blue-400 / blue-50 / blue-800.
- **Failed** (`status-failed` rose for dots/bars; `destructive` for badges and destructive buttons, which use `destructive/10` fill with destructive text).
- Overview stat levels use solid tiles: emerald-500 (within), yellow-500 (observe), red-500 (critical), white icon.
- Dark-mode badges: `*-900/70` fill, `white/80` text, same border hue.

**The Color Means State Rule.** Hue appears only when it reports a state. Never use status colors as decoration, accents, or brand color.

**The Neutral Chart Rule.** Default chart tokens `chart-1..5` are greys; the one colored chart (stores-by-status bar) uses status hues because each segment is a state.

## Typography

**Body Font:** DM Sans (variable, local file via `lib/fonts.ts`, `--font-sans`)
**Display Font:** none by default. `--display-family` is only set when a display font is chosen in the theme panel; headings render in DM Sans.
**Mono:** system monospace (Tailwind `font-mono`) for IDs, `sub_…` external IDs, job type keys like `tenant.create`.

**Character:** One humanist geometric sans doing all the work; hierarchy comes from size and weight, not from font pairing.

### Hierarchy
- **Headline** (700, 20px mobile / 24px lg, tight tracking): page title, one per page, via `PageHeader`.
- **Stat** (700, 30px): the big number on overview stat cards.
- **Title** (500, 16px, leading-snug): card titles ("Platform status" uses 18px).
- **Body** (400, 14px): table cells, descriptions, nav items. Page description under the title is 14px muted.
- **Label** (500, 12px): badges, small notes, row counts. Numbers use `tabular-nums`.

**The One Family Rule.** Do not introduce a second typeface for headings or marketing flair. DM Sans plus system mono is the whole system.

## Layout

- **Shell:** inset sidebar (256px) on a `sidebar` rail; content sits in a white panel with 14px top corners and a small margin, like a sheet laid on the rail. Sidebar collapses to an icon strip; on mobile it becomes an off-canvas sheet.
- **Sidebar contents:** logo + "AnyPress" wordmark, search field with ⌘K hint, grouped nav ("Operations": Overview, Stores, Jobs, Backups, Requests, Webhooks; "Storefronts": Versions & templates, API keys, Team), each a 16px line icon + 14px label.
- **Header** (56px, sticky, `background/40` + backdrop blur, bottom border): sidebar toggle, storefront switcher (dot + name + chevrons, admins only), then right-aligned "Sample data" badge when on fixtures, light/dark toggle, theme panel, divider, avatar user menu.
- **Content:** 24px padding, full width by default (`centered` caps at max-w-7xl). Vertical rhythm 16px, 24px from lg.
- **Overview grid:** 4 stat cards (1 / 2 / 4 columns at base / sm / xl), then a 2:1 row (Platform status, Stores by status), then Failed jobs full width.
- **Lists:** one card per page holding toolbar, table, pagination.
- **Breakpoints:** Tailwind defaults. Tables show from `lg` (1024px); below that rows become cards (2 columns from `md`). Container queries (`@container/main`, `@container/card`) tune toolbars.
- **Touch:** under `pointer: coarse` every control grows to 44px min without changing desktop sizes (unlayered rule in `globals.css`). Keep it.

## Elevation & Depth

Flat. Depth comes from the inset panel sitting on the tinted sidebar rail, 1px hairlines, and a `ring-1 ring-foreground/10` around cards. The only shadow is `shadow-sm` on the active tab pill; popovers and menus use the stock small popover shadow. The header's translucency + blur is the one material effect.

**The Hairline Rule.** Separate things with a 1px border or a muted fill, never with a drop shadow.

## Shapes

Base radius 10px (`--radius: 0.625rem`), derived steps sm 6 / md 8 / lg 10 / xl 14. Buttons, inputs, selects, tab tracks: 10px. Cards and the content panel: 14px. Row cards on phone: 10px. Badges are full pills. Status dots are circles (6–10px). Stat-card icon tiles are small squares (36px, 4px radius).

## Components

### Buttons
- **Shape:** 10px radius, 32px tall (sm 28px, icon-sm 28px square), 14px medium text, 16px icons.
- **Primary:** Ink fill, white text; hover drops to 80% opacity.
- **Outline:** background fill, hairline border; hover `muted`. Used for Filters, Columns, pagination arrows, the active page number.
- **Ghost:** no fill; hover `muted`. Inactive page numbers, icon buttons in the header.
- **Destructive:** tinted `destructive/10` fill with red text, never solid red.
- **Focus:** ring color border + 3px `ring/50` halo. Active press nudges down 1px.

### Badges (status)
- Pill, 20px tall, 12px medium. Status badges use the tinted-border trio (`success`, `warning`, `info`) or `destructive` tint; Suspended and Retried are `outline` with muted text (pause icon for Suspended).
- Mapping lives in `lib/format.ts` (`statusMeta`) and `components/admin/job-state-badge.tsx`: Ready=success, Pending/Queued=warning, Removing/Running=info, Failed=destructive, Done=success, Cancelled/Retried=outline.
- Health pill on overview: outline badge with a status-colored dot and 30%-alpha border ("All systems normal").

### Cards / Containers
- 14px radius, `card` fill, `ring-1 foreground/10`, 16px internal spacing (12px for `sm`). Header = title + muted description + optional right-aligned action (link or badge).
- **Stat card:** 24px padding, muted label, 30px bold number, 12px muted note, then a `muted/60` strip (hover `muted`) with a colored icon tile, "Open" + colored status line, and a chevron. The whole card is the link.
- **Info note:** `muted/50` fill, border, 10px radius, 14px muted text.

### Data table (`components/admin/data-table.tsx`)
- Card-wrapped, edge to edge (no inner padding around the table).
- **Toolbar** (min 56px, bottom border): segmented tabs with secondary count badges (All 20, Ready 13…), Filters outline button, and Columns menu right-aligned. Below `lg` the tabs collapse to a "All (20)" select plus sort and columns icon buttons. With rows selected the toolbar shows "N selected" and actions.
- **Header row:** 14px medium, sortable columns show an up/down chevron or a direction arrow when active.
- **Rows:** 14px, hairline dividers; primary cell is name over a 12px muted mono ID. Missing values are an em dash in muted text. Clickable rows get pointer + hover tint.
- **Footer** (top border): "Rows per page" select left; "1 - 10 of 20" plus prev / numbered pages / next right.
- **Phone:** each row becomes a bordered 10px-radius card: title cell on top, then a two-column label / value list (labels muted, 6.5rem column).
- **Empty:** centered muted text, 96px tall.

### Tabs
Muted track, 10px radius, 3px inset; active segment is a background-colored pill with `shadow-sm` (dark: input-tinted with border). Inactive text at 60% foreground.

### Inputs / Fields
32px, 10px radius, hairline `input` border, transparent fill (dark: `input/30`). Focus = ring border + 3px halo. Invalid = destructive border + tinted halo. Placeholder muted.

### Navigation
Sidebar items: one per section (Overview, Stores, Store designs, Accounts, Team and brand, Developers), 16px icon + 14px label, muted foreground; hover and active use `sidebar-accent` fill with full-strength text and a rounded rectangle. A section's pages show as link tabs above the page (`components/shell/section-tabs.tsx`, drawn like Tabs). Collapsed state shows icons only with tooltips.

### Guided tour
A tour per kind of account (`components/shell/tours.ts`, built on the Tour component in `components/ui/tour.tsx`) starts the first time someone opens the Overview in a browser; "Take the tour" on the Overview and in the account menu starts it again. Steps point at elements by `data-tour-step-id` (a space-separated list): add one to anything a new step needs, and keep step text in the dashboard's plain voice.

## Do's and Don'ts

### Do:
- **Do** treat the `before/` screenshots as the visual test: same spacing, sizes, radii, and colors after any refactor, in light, dark, and phone.
- **Do** build new pages from `PageHeader` + cards + `DataTable`; reuse the existing badge variants for any new status.
- **Do** keep all chrome on the neutral tokens and reference them by token (`bg-muted`, `text-muted-foreground`, `border`), never raw greys.
- **Do** keep the 44px coarse-pointer rule, `tabular-nums` on counts, and em dashes for empty values.
- **Do** keep the theme panel controls working, but verify only the default preset as the design.

### Don't:
- **Don't** add a brand accent color, gradients, illustrations, or a hero area. The UI stays monochrome except for status.
- **Don't** add drop shadows to cards or tables, or stack cards inside cards.
- **Don't** use solid red or solid green buttons; destructive is a tint.
- **Don't** introduce a second typeface or larger-than-24px page titles.
- **Don't** hide table columns on phone; reflow them into row cards instead.
- **Don't** name components after where an idea came from; name them by what they do.
