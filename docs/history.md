# History

This repository's history was rewritten on 2026-10-15 to remove code from a paid UI kit whose license does not allow a public repository. Every commit keeps its message, author and date. Files that came wholly from the kit are gone from every commit. Earlier versions of two files adapted from the kit, `app/(dashboard)/page.tsx` and `components/admin/data-table.tsx`, are replaced by a short note. The pull request pages for this work stay in a private archive, so this page keeps their descriptions and the Beads issue for each one.

Beads ids starting `waas-api-` live in the provisioning API's tracker; ids starting `waas-` live in the plugins tracker.

| PR | Title | Beads |
|---|---|---|
| #1 | Read-only admin dashboard on the Shadcn UI Kit shell | waas-api-plu, waas-api-plu.1 |
| #2 | Versions & templates management and job retry | waas-api-plu (API side: waas-api-plu.3) |
| #3 | Sign-in page: looping "store goes live" motion | waas-api-plu (epic only) |
| #4 | Load every font locally from @fontsource, never Google Fonts | waas-api-plu (epic only) |
| #5 | Mobile layout: sign-in page and every dashboard page | waas-api-plu (epic only) |
| #6 | fix: readable upload errors for archive uploads | waas-api-plu (epic only) |
| #7 | Add Beads issue tracking (shares the waas database) | waas-api-plu (epic only) |
| #8 | Add Change address to the store page | waas-b7l, waas-api-k1l |
| #9 | Show scheduled store backups in the Backups filter | waas-9y4 |
| #10 | Show and set a store's own email sender domain | waas-73h |
| #11 | Store page: "Connect automatically" for a sending domain's DNS records | waas-6ei |
| #12 | Add Restore to each of a store's backups | waas-3r6, waas-api-2xd |
| #13 | Docs: README for outside users, GPL-3.0 | waas-pmh |
| #14 | Requests page: the API's request log | waas-ojr |
| #15 | API keys page and New agency button | waas-api-23c |
| #16 | Remove old platform wording from docs and comments | waas-api-jc4 |
| #17 | Webhooks page: endpoints and deliveries | waas-api-04p |
| #18 | Sign in with Better Auth; agencies see their own storefront | waas-api-0pq.2, waas-api-0pq.6 (epic waas-api-0pq) |
| #19 | Overview follows the storefront switcher | waas-api-63o |
| #20 | Team page: invite people by email, change roles, remove them (waas-api-0pq.3) | waas-api-0pq.3 |
| #21 | Connect an app page: approve an AI app's connection as yourself (waas-api-0pq.4) | waas-api-0pq.4 |
| #22 | Pin Node 22 and approve install scripts | waas-api-co4 |
| #23 | Upgrade eslint 9 to 10 (waas-api-ivq) | waas-api-ivq |
| #24 | Lists: our own Filters menu, chips and search instead of the kit filter builder (waas-api-mx5.1) | waas-api-mx5.1 |
| #25 | Appearance panel: our own rebuild of the theme customizer (waas-api-mx5.2) | waas-api-mx5.2 |
| #26 | Overview: our own stat cards and platform status block (waas-api-mx5.3) | waas-api-mx5.3 |
| #27 | Shell: our own sidebar, search and header (waas-api-mx5.4) | waas-api-mx5.4 |
| #28 | Remove the last UI kit leftovers (waas-api-mx5.5) | waas-api-mx5.5 |
| #29 | Drop the last kit mentions from comments and DESIGN.md (waas-api-mx5.6) | waas-api-mx5.6 |

## #1 Read-only admin dashboard on the Shadcn UI Kit shell

Merged 2026-10-07 · Beads: waas-api-plu, waas-api-plu.1

First version of the WaaS admin dashboard: five read-only views on the Shadcn UI Kit's Dashboard Shell and GitHub sign-in limited to an allowlist. It reads the provisioning API's admin endpoints (`openapi/admin/admin-api.yaml`, API PR #9, merged), or built-in sample data. Versions & templates management and job retry are in the stacked PR #2.

#### Pages

| Page | What it shows | Kit source |
|---|---|---|
| Overview `/` | API, database and job-queue status; store, job and backup totals; failed jobs | stat-card5, chart39 (current state only; uptime history needs monitoring) |
| Stores `/stores` | every store across storefronts: storefront, version, main domain (+N), status, suspended, last backup; tabs with counts; filter builder | Orders page table |
| Store `/stores/[id]` | details, domains (main/base/redirect), backups, option and constant **names only**, recent jobs and failures | Orders detail layout |
| Jobs `/jobs` | Queued / Running / Failed tabs; click a row for the error and timings | Orders table + tables11 dialog |
| Backups `/backups` | all backups, deleted stores' included, with expiry | Orders table |

The storefront switcher (the kit's store switcher) narrows the pages via `?product=<id>`. This PR has no action buttons.

Screenshots from a local run with sample data are in `docs/screenshots/` and the README. The sample data uses obviously fictional names ("Example Store N" on reserved `.example` domains).

#### How it works

- **Data**: `AdminApi` (`lib/api/client.ts`) has two implementations. The live client calls `/admin/*` server-side with `Authorization: Bearer $WAAS_ADMIN_TOKEN`, uncached. Sample data is used only with `WAAS_API_FIXTURES=1`, and the header then shows a "Sample data" badge. With neither configured, pages show an error.
- **Spec mapping**: `lib/api/wire.ts` mirrors the admin spec. `http.ts` maps it to the page types and joins the store and storefront names that backups and jobs carry only as ids. It reads lists in pages of 200 (capped at 2,000) and jobs once per state.
- **Auth**: Auth.js v5 (pinned `5.0.0-beta.32`) with GitHub, JWT sessions (12 h), no database. Sign-in, `proxy.ts` and the dashboard layout all check `ALLOWED_GITHUB_LOGINS`.
- **Next 16**: `cacheComponents` is off, because every page is per-request data behind sign-in.
- **Kit code**:
  - shadcn init with the Radix base and the kit's `radix-nova` style. The kit registry in `components.json` reads `SHADCNUIKIT_API_KEY`; no key or install token is committed.
  - Fixed two kit packaging gaps: `panel.tsx` imported from the wrong module, and the shell needed `useIsTablet`.
  - Overpass Mono loads from `@fontsource`, because CI's Turbopack build failed on the Google CSS for that font.
  - ESLint relaxes 5 rules for the vendored folders only.

#### Checked

- `npm run typecheck`, `npm run lint` (0 errors) and `npm run build` pass; CI is green.
- **Against the real admin API.** Lane 2's branch ran locally on Postgres 16 with an `ADMIN_TOKEN`, seeded through `/v1`: 2 storefronts, 7 stores, a custom main domain, a suspend with backup, a manual backup, and a deleted store whose backup is kept. A job failure and a Failed tenant were inserted by hand. Every page rendered the API's data.
- **Sign-in, with headless Chromium.** A signed-out visitor goes to `/login`. A session whose login isn't on the allowlist also goes to `/login`. Every page renders for an allowed login.
- **Not checked:** the GitHub OAuth round trip (no OAuth app yet), and the deployed API (unreachable from this environment).

#### To deploy (not done here)

1. **GitHub OAuth app**: Homepage `https://<dashboard domain>`, callback `https://<dashboard domain>/api/auth/callback/github`. Create a second app for local development with `http://localhost:3000/api/auth/callback/github`.
2. **Vercel project** from this repo, with these environment variables:
   - `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`
   - `ALLOWED_GITHUB_LOGINS`
   - `WAAS_API_URL`, `WAAS_ADMIN_TOKEN` (from the waas-api app in Coolify), or `WAAS_API_FIXTURES=1` for a preview on sample data

## #2 Versions & templates management and job retry

Merged 2026-10-07 · Beads: waas-api-plu (API side: waas-api-plu.3)

Adds the rest of the v1 scope on top of #1 (merged): Versions & Templates management, which replaces the old hosting console, and Retry for failed jobs. It is built against the admin endpoints in waas-provisioning-api PR #12.

#### What it adds

- **Versions & templates** (`/versions`, new sidebar entry). You first pick a storefront.
  - **Versions tab**: the production version is marked. "New version" creates a version from a base template, or from an archive uploaded in the browser with a progress bar, and can copy group templates into it. Each row's menu has "Make production" and "Delete".
  - **Templates tab**: base templates and group templates, each with "Upload template" (name, description, group name for group templates, then the archive) and Delete.
  - "Make production" and every delete ask for confirmation in plain words. When the API refuses something, its own message is shown, e.g. "Stores still run on this version; move them first".
- **Retry** on the Jobs page: a Retry button in a failed job's dialog, plus row checkboxes on failed jobs and a "Retry N" button. The result is reported per job.
- **Changes** go through server actions (`app/(dashboard)/actions.ts`). Each one re-checks the signed-in login against the allowlist, since a server action can be called directly, and validates its ids and text before calling the API.
- **Client**: `/admin/products`, `/admin/products/{id}/versions[/{id}[/production]]`, `/admin/products/{id}/basesnapshots` (DELETE takes `?id=`) and `POST /admin/jobs/failures/{id}/retry`. The bodies are the same as the API's /v1 operations. API error messages are passed through.
- **Sample data**: versions, templates and retries can be changed in memory, with the API's rules (name formats, no deleting the production version or a version stores run on). Uploads are simulated. Store and template names are neutral and obviously fictional.
- **Uploads** go from the browser straight to the upload URL the API returns: a single `PUT`, as the old hosting platform did. A real store host's storage will need a CORS rule allowing `PUT` from the dashboard's address. The fake provisioner's URLs accept nothing.

#### Checked

- `npm run typecheck`, `npm run lint` (0 errors) and `npm run build` pass.
- **Headless Chromium on sample data.** All of these ran with no page errors:
  - create a version from a template
  - a duplicate name caught in the form
  - make it production, with the confirmation
  - delete an unused version
  - deleting a version stores run on is refused with the message
  - upload a group template
  - retry one job, then retry two in bulk
- **Against the API's `feature/admin-versions` branch, running locally on Postgres with seeded data.** These worked:
  - versions and templates listed
  - a template created (its upload to the fake URL failed, as expected)
  - a version created from it and made production
  - deleting the old production version refused by the API: "still has 4 tenant(s); move them first"
  - a failed job retried; the store went back to Pending
- **Not checked:** a real archive upload, because there is no store host or storage yet.

Screenshots (sample data) are in `docs/screenshots/` and the README: 7 to 14 cover this PR.

## #3 Sign-in page: looping "store goes live" motion

Merged 2026-10-07 · Beads: waas-api-plu (epic only)

Adds a looping Lottie animation to the sign-in page's left panel: a storefront page assembling in a browser window, then going live.

#### The animation

A browser window, shown as a 5 s seamless loop (300 frames at 60 fps, 480×360, transparent):
1. Its header bar, hero lines, three product tiles and a cart button settle into place in reading order.
2. A green dot lights up in the title bar, with a ping ring.
3. A check badge pops onto the window's corner. This is the focal beat.
4. It holds, then the page clears back to the empty window.

It contains no text, no product imagery and nothing industry-specific. Colours come from the theme tokens in `app/globals.css` (card, border, chart grays, primary), with a separate dark-mode version. The green matches the kit's status badges (green-600 in light, green-400 in dark).

- `scripts/motion/login-motion.mjs` builds `public/motion/login-light.json` and `login-dark.json` (about 19 KB each) from one definition. It follows the [text-to-lottie](https://github.com/diffusionstudio/lottie) skill: its easing anchors (entrance-sharp, settle-soft, expressive-pop for the badge, exit-accelerate), 2–8 frame staggers, and an identical first and last frame.
- I checked both files in the skill's official Skottie player at frames 0, 40, 70, 120, 200, 270, 282 and 299. That turned up one flaw, now fixed: the check mark used to shrink into a "v" while the page cleared.
- `login-{light,dark}.webp` (about 6 KB each) are frame 200 rendered with lottie-web.

#### How it's wired

`components/admin/login-motion.tsx` follows otaku-solutions' `LottiePlay` (lottie-react loaded with a dynamic import, `ssr: false`, and the JSON fetched from `/public`), with these differences for the sign-in page:
- The **still renders on the server** in a fixed 4:3 box. There is no layout shift, it works without JavaScript, and it is what reduced-motion users see. The light and dark stills switch with the `dark:` variant.
- The animation loads **only after the page is idle**, only at `lg` and up (the panel is hidden on smaller screens, so phones load nothing), and **never under `prefers-reduced-motion`**. It plays the version for the current theme and switches when the theme changes.
- It **starts at frame 200**, the frame the still shows, so the swap from still to animation is invisible.
- The sign-in form doesn't depend on it. If the JSON fails to load, the still simply stays.
- `proxy.ts` lets `/motion/*` through without a session, because the sign-in page needs these files before anyone is signed in. Without that they were redirected to `/login` and the animation never loaded.

#### Checked

- `npm run typecheck`, `npm run lint` (0 errors) and `npm run build` pass.
- **Headless Chromium against `next start`:**

| Case | Result |
|---|---|
| Light | animates (SVG frames change) |
| Dark | animates, with the dark file |
| Reduced motion | still only |
| JavaScript off | still only |
| 390 px phone | nothing loads |
| Layout shift | 0 in every case |
| Sign-in button ready | 90–300 ms in every case |
| Page errors | none |

- `/motion/login-light.json` and `/motion/login-dark.webp` return 200 signed out, and `/stores` still redirects to sign-in.

Screenshots: `docs/screenshots/0-login.png` (light) and `docs/screenshots/0-login-dark.png` (dark). Both show the still frame, which is also what the animation shows at that moment.

## #4 Load every font locally from @fontsource, never Google Fonts

Merged 2026-10-07 · Beads: waas-api-plu (epic only)

Vercel's production build of `2add59f` failed in Turbopack on the Google Fonts CSS for Plus Jakarta Sans:

> Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font' … next/font/google queries have exactly one entry

It is the same intermittent bug CI hit on Overpass Mono, which I fixed for that one font in #1. This PR applies the same fix to every font, so builds never fetch from Google.

#### Change

- `lib/fonts.ts`: all eleven kit fonts load with `next/font/local` from `@fontsource` files (latin subset, matching the old `subsets: ["latin"]`).
  - **Static fonts, same weights as before:** Roboto 400/500/700, Plus Jakarta Sans 400/500/600/800, Montserrat 400/500/600, Poppins 400/500/600, Overpass Mono 400/500/700, PT Sans 400/700, Hedvig Letters Serif 400, Kumbh Sans 400, Outfit 400.
  - **Variable fonts** (no weights were fixed before, i.e. the full range): the `@fontsource-variable` files for Inter (100–900) and Geist (100–900).
- `app/layout.tsx`: the default font, DM Sans, moves into `lib/fonts.ts` as a local variable font (100–1000, `--font-sans`).
- **Same CSS variable names**, so the kit's font picker (`app/themes.css`, `lib/themes.ts`) is unchanged.
- **New dependencies:** 3 `@fontsource-variable` and 8 `@fontsource` packages, used only at build time; the font files are bundled into `.next/static/media`.

#### Checked

- `npm run typecheck`, `npm run lint` (0 errors) and `npm run build` pass.
- **Offline build:** I ran `next build` inside a network namespace with no outside network (loopback only; `curl https://fonts.googleapis.com` returned 000). This branch builds and bundles 24 font files. Main's build, run the same way, **fails**: "There was an issue establishing a connection while requesting `https://fonts.googleapis.com/css2?family=DM+Sans…`". So the build no longer needs Google at all.
- **Browser, `next start`:**
  - Default DM Sans and the body-font options I tried (Inter, Roboto, Overpass Mono) all load.
  - Every display-font option loads: Geist, Montserrat, Poppins, Plus Jakarta Sans, Outfit, Kumbh Sans, Hedvig Letters Serif.
  - No request left the dashboard's own origin, and none failed.

## #5 Mobile layout: sign-in page and every dashboard page

Merged 2026-10-07 · Beads: waas-api-plu (epic only)

Stacked on #4 (local fonts). Once #4 merges, retarget this to `main`. This PR changes layout and responsive behaviour only, no features.

#### Sign-in page
Below 1024px the page is one column, centred vertically with `min-h-dvh`. From top to bottom:
- the "WaaS Admin" mark
- a 240px copy of the store-goes-live motion (288px from 768px)
- "Sign in" and its line
- a full-width "Continue with GitHub" button, 44px tall
- the panel's one-line description, small and muted, at the bottom

The motion rules are unchanged:
- The server-rendered still comes first, in a fixed aspect-ratio box, so there is no layout shift and it works without JS.
- The animation starts only after idle.
- With reduced motion, only the still shows.
- The button never waits on it.

The page keeps one motion copy for the large layout and one for the small. A `media` prop on `LoginMotion` means only the copy on screen fetches the Lottie. The hidden copy's `sizes` resolves to a 256px image.

Tablet portrait (768px) uses the stacked layout. Desktop is unchanged; I compared it with `docs/screenshots/0-login.png`.

#### Dashboard pages
- **Lists (Stores, Jobs, Backups):** below `lg`, `AdminDataTable` shows the rows as cards with label/value pairs, in two columns from `md`. The tabs become a select (they were hidden below `md` before) and a sort menu replaces the column headers. Selection and bulk retry work in the cards.
- **Versions, Templates and store detail tables:** on narrow screens the secondary columns (shared site, created, group, reason, when, error) move under the row's name. Header buttons ("New version", "Upload template") stack under the card text instead of squeezing it.
- **Dialogs:** capped at `100dvh - 2rem`, and the body scrolls (`dialog.tsx`, `alert-dialog.tsx`).
- **Tap targets:** one `@media (pointer: coarse)` rule in `globals.css` sets a minimum height and width of 44px on buttons, triggers, close buttons, inputs, selects, tabs, menu items and sidebar items. Checkboxes and radios get a 44px hit area. Desktop keeps its compact sizes.
- **Header:** the sidebar toggle and theme-customizer buttons now have accessible names. Gaps are tighter on phones, and the avatar is 44px on touch screens.

#### Checked
An emulated phone (Playwright, touch on) checked every page and the dialogs at 390×844 and 768×1024: no horizontal page scroll, and no control under 44px (inline text links excepted).

`npm run typecheck`, `npm run lint` (0 errors; the same 7 warnings as on `main`) and `npm run build` all pass.

#### Screenshots (`docs/screenshots/mobile/`)
- `before/` and `after/` at 390px: sign-in (after also has dark), Overview, Stores, store detail, Jobs and its dialog (after only), Backups, Versions (storefront picker, list, new-version dialog), Templates (list, upload dialog), and the open sidebar (after only).
- `tablet/` at 768px: sign-in (light and dark), Overview, Stores, Jobs, store detail, Versions, Templates.

## #6 fix: readable upload errors for archive uploads

Merged 2026-10-07 · Beads: waas-api-plu (epic only)

#### What

The dashboard uploads from the browser in two places, both via `uploadArchive` (`lib/upload-archive.ts`):

| Flow | API call that presigns | Object key |
|---|---|---|
| Versions → New version → "Upload an archive" | `POST /…/versions` with `useCustomUpload: true` → `uploadUrl` | `uploads/<versionId>.tgz` / `.zip` |
| Versions → Upload base/group template | `POST /…/basesnapshots` → `uploadUrl` | `base/<id>.tgz` |

Request shape: a single `PUT` (no multipart) of the raw file to a SigV4 query-presigned R2 URL (`X-Amz-SignedHeaders=host`, `UNSIGNED-PAYLOAD`, `X-Amz-Expires=3600`). The browser adds `Content-Type` from the file (e.g. `application/gzip`, `application/zip`), so it sends a CORS preflight for `PUT` + `content-type`. The bucket needs a CORS rule for that; that change is made in Cloudflare, not in this PR.

This PR makes the failures readable:

- **Blocked request** (no CORS rule for this origin, or a dropped connection) → says so and names the origin. R2 sends no CORS headers on an expired-link 403, so the browser can't see that status. The PR tells an expired link apart by checking the URL's own `X-Amz-Date` + `X-Amz-Expires`.
- **Expired link** (`ExpiredRequest`/403) → asks the user to create it again for a fresh link. The PR also checks the link before sending.
- **Too large** (`EntityTooLarge`/413) → explains it. Empty or >4 GB files (the API's documented max) are now refused in the file picker before the version or template is created, so they leave no orphan behind.
- 5xx → asks the user to try again later. Any other status shows the HTTP code and the S3 error code.

#### Tests

- Adds vitest (`npm test`, also run in CI) with 13 tests for size checks, expiry parsing, status/code messages, and `uploadArchive` against a stub XHR.
- `npm run typecheck`, `npm run lint` (0 errors; the existing warnings are in vendored files) and `npm run build` pass locally.

## #7 Add Beads issue tracking (shares the waas database)

Merged 2026-10-09 · Beads: waas-api-plu (epic only)

waas-plugins and waas-provisioning-api already use Beads; the dashboard didn't. This adds the same `.beads/` settings, pointing at the **same DoltHub database as waas-plugins** (`chowderr/waas`), since the dashboard is part of the same WaaS product.

#### What's added
- `.beads/config.yaml`: `sync.remote: chowderr/waas`, with auto-export on (not git-added).
- `.beads/metadata.json`: the `waas` Dolt database and project id, identical to waas-plugins, so both repos read and write one issue list.
- `.beads/.gitignore`: the standard Beads ignore list, so the local database and runtime files are never committed.

No app code changes.

#### Using it
After pulling: `bd bootstrap` (fetches the issues from DoltHub), then `bd list`. Afterwards `bd dolt pull` / `bd dolt push` to sync. DoltHub access needs a one-time `dolt login`.

#### Testing
Not run here: this session has no `bd` or DoltHub credentials. The files are copied from waas-plugins, where the same setup is in daily use.

## #8 Add Change address to the store page

Merged 2026-10-13 · Beads: waas-b7l, waas-api-k1l

Before: a store's domains were read-only in the dashboard.

After: the Domains card on a store's page has a **Change address** button. You type a new address, and the store moves there while its old address keeps redirecting.

How: a new `setMainDomain` server action checks the session and the address, then calls the API's new `PUT /admin/tenants/{id}/domains/main` (waas-provisioning-api, same branch name). This needs that API change deployed first. The fixture API supports it too.

## #9 Show scheduled store backups in the Backups filter

Merged 2026-10-13 · Beads: waas-9y4

Before: the Backups page's Reason filter only offered Manual and Suspend.

After: it also offers Scheduled, for the nightly store backups added in hamchowderr/waas-provisioning-api#34. Those rows already render without this change, since the reason column prints the value as-is.

How: adds `"scheduled"` to the backup reason type in `lib/api/wire.ts` and `lib/api/types.ts`, plus one filter option. `tsc --noEmit` passes.

## #10 Show and set a store's own email sender domain

Merged 2026-10-13 · Beads: waas-73h

Before: there was nowhere to set which domain a store's email comes from.

After: each store page has an **Email sender** card. "Use own domain" adds a domain such as shop.example.com. The card then lists the three DNS records to add, each with copy buttons for the name and value. A badge shows the state: "Waiting for DNS" until toSend verifies the records, then "Sending". "Stop using this domain" moves the store back to the platform address.

How: there's a new `mailDomain`, `setMailDomain` and `removeMailDomain` on the admin API client, backed by the HTTP API and by the sample data. Two new server actions call them, and the client component is `stores/[id]/mail-sender.tsx`. The card needs api PR hamchowderr/waas-provisioning-api#37. Against an API without that PR, the card shows the platform address because GET answers 404.

I checked it in a browser with sample data: adding a domain shows the records and the pending badge. Typecheck, lint and tests pass.

## #11 Store page: "Connect automatically" for a sending domain's DNS records

Merged 2026-10-13 · Beads: waas-6ei

Before: the store page's Email sender card listed a pending sending domain's DNS records, and someone had to copy them into the DNS host by hand.

After: when the domain's DNS host supports Domain Connect and has accepted the AnyPress email template, the card also shows a "Connect automatically at <DNS host>" button. It opens the host's page, which adds the records once approved. For any other DNS host the card is unchanged.

How: a new `domainConnect()` on the admin API client calls `GET /admin/tenants/{id}/domain-connect` (waas-provisioning-api #39); the sample data returns a supported link. The page asks only while the domain is waiting for DNS, and ignores errors.

## #12 Add Restore to each of a store's backups

Merged 2026-10-13 · Beads: waas-3r6, waas-api-2xd

Before: a store's page listed its backups but nothing could be done with them.

After: each Ready backup has a Restore button. It opens a confirm dialog explaining that the store goes back to that moment, with "Back up the store as it is now first" ticked by default. The new safety backups show with reason "Before restore" on the store page and the Backups page (including its filter).

How: `restoreBackup` server action → `POST /admin/tenants/{id}/restore` (needs hamchowderr/waas-provisioning-api on the same branch to be deployed first). Fixture API implements it too. Typecheck, lint and tests pass; checked in the browser against sample data.

## #13 Docs: README for outside users, GPL-3.0

Merged 2026-10-14 · Beads: waas-pmh

Before: the README described our own deployment and had no license section. The repo had no license file.

After: the README explains what the dashboard does and how to set it up yourself (GitHub App, deploy, environment variables, bucket CORS). The repo is GPL-3.0 for our own code; the Shadcn UI Kit parts stay under the kit's license.

How:
- `README.md` rewritten, with an environment variable table that includes `AUTH_TRUST_HOST` for hosts other than Vercel.
- `.env.example`: generic `WAAS_API_URL`, empty `ALLOWED_GITHUB_LOGINS`, added `AUTH_TRUST_HOST`.
- `LICENSE` added, plus `license` fields in `package.json` and the lockfile.

No code changes.

## #14 Requests page: the API's request log

Merged 2026-10-14 · Beads: waas-ojr

Beads: **waas-ojr**. Needs the waas-provisioning-api PR "Request log: record every API call and admin change" deployed first (`GET /admin/requests`).

Before: the dashboard had no way to see what the storefronts asked the API, or why a call was refused.

After: a **Requests** page under Operations lists every storefront call and admin change: time, method and path, status (green / orange / red), store, storefront, duration and caller IP and user agent, with the API's error message under any refused or failed call. Tabs for Errors, Storefront calls and Admin changes; the header shows the last 24 hours' totals. Each store page gets an "API requests" button that opens the page filtered to that store, and the storefront switcher narrows it too.

How: `requests()` on `AdminApi` (live client reads the newest 1,000 rows, in pages of 200; sample data in fixtures). Typecheck, lint and tests pass; checked in the browser with sample data.

## #15 API keys page and New agency button

Merged 2026-10-14 · Beads: waas-api-23c

Before: a new agency, or a new or replacement API key, meant running `npm run create-key` on the API server.

After: a new **API keys** page under Storefronts.
- **New agency** creates the agency's storefront, with an optional store limit, and its first key.
- Each storefront has its own keys page. It shows every key's state (active, expiring, revoked) and when it was last used, and has **New key**, **Rotate** and **Revoke**.
- Rotate keeps the old key working for a period you pick (stop now, 1 hour, 24 hours or 7 days), so the storefront can switch over without downtime.
- Revoking a storefront's last active key gets an extra warning.
- A new key's secret is shown once, with copy buttons. The dialog only closes after "I've copied the secret" is ticked.

Needs API PR hamchowderr/waas-provisioning-api#48, which adds the endpoints; merge that first. Sample-data mode (`WAAS_API_FIXTURES=1`) has the same flows.

How: four admin calls in the API client (`apiKeys`, `createAgency`, `createApiKey`, `rotateApiKey`, `revokeApiKey`), server actions that check the session and inputs, and `app/(dashboard)/keys/`. Secrets travel only from the server action's return value to the dialog's state; nothing logs or caches them.

Screenshots (sample data): `/mnt/project-files/waas/api-keys/` in the project.

Checked locally: typecheck, lint (0 errors), tests and `next build` pass.

Beads: waas-api-23c

## #16 Remove old platform wording from docs and comments

Merged 2026-10-14 · Beads: waas-api-jc4

Before: the README and code comments described API shapes by the old hosting platform's name and uploads as working "as the old hosting platform did".

After: they refer to the API's own `/v1` operations.

How: wording only, in 6 files. No behaviour changes.

Beads: waas-api-jc4

## #17 Webhooks page: endpoints and deliveries

Merged 2026-10-14 · Beads: waas-api-04p

Beads: **waas-api-04p**. Needs hamchowderr/waas-provisioning-api#50 (the `/admin/webhooks` endpoints) deployed first.

Before: the dashboard had no view of webhooks. The API didn't send any yet.

After: a new **Webhooks** page under Operations has two parts.
- **Endpoints:** every storefront's endpoints, showing the URL, the events each one gets, whether it's on, sent and failed counts for the last 24 hours, pending deliveries and the last attempt. The menu on each one can send a test, show its deliveries, turn it off or on, rotate its secret or delete it. Rotate and delete ask first. Add endpoint takes a storefront, a URL, a description and event checkboxes (none ticked means every event). A new or rotated secret is shown once, with a copy button.
- **Recent deliveries:** the newest 1,000, with Failed, Pending and Delivered tabs, the store, the endpoint, attempts, the response status and any error, plus a Retry button on failed and delivered rows.

The page supports `?product=` and `?endpoint=`. The sample data (`WAAS_API_FIXTURES=1`) includes three endpoints and 20 deliveries.

**How:** new `AdminApi` methods in `lib/api` (types, wire, http, fixtures), six server actions using the existing `run()` session and input checks, plus `app/(dashboard)/webhooks/` and a nav entry.

**Checks:** typecheck passes. Lint shows 0 errors, and its 7 warnings are already there in kit files this PR doesn't touch. `npm test` passes 13 of 13. `WAAS_API_FIXTURES=1 npm run build` builds, and `/webhooks` returned 200 on sample data. The buttons were not clicked through in a browser.

## #18 Sign in with Better Auth; agencies see their own storefront

Merged 2026-10-15 · Beads: waas-api-0pq.2, waas-api-0pq.6 (epic waas-api-0pq)

Before: only GitHub logins on the allowlist could sign in, and everyone who did saw every storefront.

After: platform admins (`ALLOWED_GITHUB_LOGINS`) sign in and see everything, as before. A storefront's own people (an agency and its staff) can now sign in too, and they see only their own storefront: its stores, jobs, backups, request log, versions, API keys and webhooks.
- Owners and admins can make changes. Members can only look.
- People join through an invitation link, `/invite/<id>`.
- Someone signed in without a storefront gets a short "no storefront yet" screen.
- Someone in several storefronts can switch between them from the user menu.

This needs the API's sign-in turned on first (waas-provisioning-api #54, merged). On the API, set `AUTH_URL` to this dashboard's address, plus `AUTH_SECRET` and the GitHub App's ID and secret. The GitHub App also needs the account permission "Email addresses: read-only".

**How**
- **Auth.js is gone.** `app/api/auth/[...all]` passes every request through to the API's Better Auth, so the session cookie belongs to the dashboard alone. The GitHub callback path (`/api/auth/callback/github`) doesn't change.
- **`auth.ts`.** `getViewer()` asks the API who is signed in (`GET /account`) once per request. A GitHub login on `ALLOWED_GITHUB_LOGINS` makes that person a platform admin.
- **`lib/api`.** The client still calls the same routes:
  - A platform admin's calls go to `/admin` with the admin token, as before.
  - A storefront's people reach `/account` with their session and `X-Session-Auth: 1`. There the API serves the same routes, narrowed to their storefront, so no page needed changing.
- **Server actions** check who is signed in and refuse changes from members. The API enforces both checks too.
- **`proxy.ts`** only checks that a session cookie is present. The layout checks the session against the API.
- **Smaller changes:**
  - A customer's keys and versions pages open on their storefront.
  - The storefront switcher is hidden for customers.
  - The request log shows the API's new `account` source under "Dashboard changes".
  - The app is renamed "AnyPress".
- **Docs.** `AUTH_SECRET`, `AUTH_GITHUB_*` and `AUTH_TRUST_HOST` are no longer used here. `AUTH_PROVIDERS` (optional) picks the sign-in buttons. The README and `.env.example` are updated.

**Tested**
- typecheck, lint and unit tests pass, and `next build` succeeds.
- A browser run against a local API with sign-in on (fake provisioner, two storefronts) covered four people:
  - **Platform admin:** sees both storefronts.
  - **Agency owner:** sees only their own store, keys and versions.
  - **Stranger:** gets "No storefront yet".
  - **Invited viewer:** accepted the invitation on `/invite/<id>`, then landed on the dashboard.
- Signed-out visitors are sent to `/login`. The pass-through route keeps Better Auth's state cookie and builds the GitHub callback on the dashboard's address.

Beads: waas-api-0pq.2 (epic waas-api-0pq)

## #19 Overview follows the storefront switcher

Merged 2026-10-15 · Beads: waas-api-63o

Before: picking a storefront in the header switcher left the Overview page showing all storefronts, so it looked like nothing happened.

After: the Overview's store, job and backup counts and its failed jobs are for the chosen storefront, the heading names it, and the cards link to Stores, Jobs and Backups for that same storefront.

**How**: `overview(productId)` calls `/admin/overview?productId=` (needs the API change in waas-provisioning-api, Beads waas-api-63o). Fixtures narrow the same way. Typecheck, lint and tests pass.

Beads: waas-api-63o

## #20 Team page: invite people by email, change roles, remove them (waas-api-0pq.3)

Merged 2026-10-15 · Beads: waas-api-0pq.3

Before: there was no way in the dashboard to see who could sign in to a storefront, or to invite anyone.

After: there is a new **Team** page under Storefronts. It lists a storefront's people with their roles and its pending invitations. **Invite** emails someone a link. Owners and admins can change a person's role or remove them. Members only see the list. Pending invitations can be copied as links or cancelled. If an email fails, the page shows the link to send by hand. The platform admin picks a storefront first, or follows the switcher, and invites its first owner the same way.

How: new `team`, `invite`, `cancelInvitation`, `setMemberRole` and `removeMember` calls on the API client, plus sample data in the fixtures and server actions. The page hides what the viewer may not do, and the API enforces the same rules. This needs the waas-provisioning-api PR for waas-api-0pq.3 (the `/account` team routes and the PATCH route), so merge that one first.

Checked: typecheck, lint, unit tests, and a browser run against a local API with emailed links. The owner invited someone, that person accepted and saw the page read-only, and the owner made them an admin. Also checked at phone width.

## #21 Connect an app page: approve an AI app's connection as yourself (waas-api-0pq.4)

Merged 2026-10-15 · Beads: waas-api-0pq.4

Before: connecting Claude or ChatGPT to the AnyPress connector meant typing an API key and secret.

After: choosing "Sign in to AnyPress" on the connector's approve page lands on a new page, `/connect/[id]`, on the dashboard. The page:
- Signs the person in first if needed.
- Shows which app is asking and where it will return to.
- Lets them pick their storefront when they're on more than one.
- Has an "Allow it to make changes" box, shown only when their role allows changes.
- Offers Approve or Cancel, then sends the browser back to the app.

It also handles three other cases: an expired or already used link, someone who isn't on any storefront's team, and errors from the API.

How: a server component reads the request through `GET /account/oauth/requests/{id}` using the person's session. A server action answers it through `POST /account/oauth/requests/{id}`, and the browser then goes to the address the API returns, which may be an app scheme. This depends on the waas-provisioning-api PR for waas-api-0pq.4, so merge that one first.

Checked: typecheck, lint, and a browser run against a local API. The person signed in, approved, the app received its code, and its token listed stores through /mcp.

## #22 Pin Node 22 and approve install scripts

Merged 2026-10-15 · Beads: waas-api-co4

Before: Vercel builds warned that `"node": ">=22"` would silently move to the next major Node release, and newer npm warned that esbuild and unrs-resolver run install scripts nobody approved.

After: `engines.node` is pinned to `22.x`, and those two packages are listed under `allowScripts`, so both warnings go away. Any new package that wants to run install scripts will now be flagged.

How: `package.json` only (the lockfile picks up the engines change). Telemetry is turned off separately with `NEXT_TELEMETRY_DISABLED=1` in the Vercel project. eslint stays on 9: eslint 10 works, but eslint-config-next's react, import and jsx-a11y plugins don't list it as supported yet, so upgrading would swap one warning for three. Lint, typecheck, tests and build pass locally.

Beads: waas-api-co4

## #23 Upgrade eslint 9 to 10 (waas-api-ivq)

Merged 2026-10-15 · Beads: waas-api-ivq

Before: the dashboard was held on eslint 9 (see #22) because eslint-plugin-react, eslint-plugin-jsx-a11y and eslint-plugin-import, which `eslint-config-next` pulls in, don't list eslint 10 as supported.

After: the dashboard runs eslint 10.12 with the same Next.js rules and the same lint result (0 errors, the same 7 warnings as before).

Beads: waas-api-ivq

How: as of today the newest releases of those three plugins (react 7.37.5, jsx-a11y 6.10.2, import 2.32.0) still declare `eslint <=9` peers, and `eslint-config-next` 16.4.1 / 16.5 canary still depend on them. Their code does work on eslint 10 for every rule Next.js enables, so `package.json` gets npm `overrides` that point their eslint peer at our root eslint, which makes `npm ci` clean with no ERESOLVE warnings. Checked on eslint 10.12:
- All 24 react / jsx-a11y / import rules that `eslint-config-next` turns on ran across the whole codebase without errors, and a fixture with deliberate mistakes made each of them report.
- Turning on every rule in those three plugins found 5 that crash on eslint 10 (`react/jsx-equals-spacing`, `jsx-tag-spacing`, `jsx-curly-spacing`, `jsx-one-expression-per-line`, `import/order`) because they call SourceCode methods eslint 10 removed. None are enabled by Next.js or by our config; don't turn them on until the plugins ship eslint 10 releases.
- `npm run typecheck`, `lint`, `test` and `build` all pass locally.

The overrides can be removed once those plugins publish eslint 10 support.

## #24 Lists: our own Filters menu, chips and search instead of the kit filter builder (waas-api-mx5.1)

Merged 2026-10-15 · Beads: waas-api-mx5.1

Before: Stores, Jobs, Backups, Requests and Webhook deliveries had a "Filters" button backed by a paid third-party filter builder (~18,000 lines: free-form rules, nested and/or, a cascader).

After: the same "Filters" button opens a menu with one submenu per column (Storefront, Version, Job type, Reason, Method, Caller IP, Event, Endpoint), and each value shows its row count. Picked values show as a removable chip ("Version: v1.4 ×"). A search box sits next to Columns. Tabs, sorting, columns, pagination and the phone card layout are unchanged.

This is the first step of replacing the paid UI kit so the repo can stay public (Beads epic waas-api-mx5, this PR is waas-api-mx5.1).

How: new `components/admin/table-filters.tsx` built on the free shadcn dropdown menu and input group. `AdminDataTable` takes `searchPlaceholder` + `facets` instead of `filterFields`. Removed `components/ui/filters/`, `components/ui/cascader/`, `components/table-filter-helpers.tsx` and `lib/filter-query-match.ts`; the sortable column header moved to `components/admin/sortable-header.tsx`. Two small behavior changes: the Stores page drops its separate Status and Domain filters, because the status tabs and the search box already cover them. Also adds `DESIGN.md` (written with the Impeccable skill) that pins today's look for the rest of the swap.

Checked: lint, typecheck, unit tests and production build pass. Before/after screenshots (light, dark, phone) were compared in sample-data mode.

## #25 Appearance panel: our own rebuild of the theme customizer (waas-api-mx5.2)

Merged 2026-10-15 · Beads: waas-api-mx5.2

Before: the palette button in the header opened a third-party theme customizer (light/dark, accent and chart colors, fonts, radius, scale, page width, sidebar style and collapse, random, reset), backed by a 1,260-line stylesheet.

After: the same button opens our own **Appearance** panel with the same controls. Colors are round swatches instead of dropdowns, and "Random" is now "Shuffle". The default look is pixel-identical to before (compared screenshots of every non-list page in light, dark and phone). A saved choice still carries over, because the same cookies are used.

Part of replacing the paid UI kit so the repo can stay public (Beads epic waas-api-mx5, this PR is waas-api-mx5.2).

How: `lib/appearance.ts` holds the options, reads and writes the cookies, and turns choices into CSS variables. `app/layout.tsx` puts those on `<body>` server-side, so the first paint is right, and `components/appearance-provider.tsx` keeps them in step on change. The panel is `components/layout/header/appearance-panel.tsx` on the free shadcn sheet, toggle group and select. `globals.css` imports Tailwind with `theme(static)` so every palette color variable exists. Removed `components/theme-customizer/`, `components/active-theme.tsx`, `lib/themes.ts` and `app/themes.css`. That stylesheet also carried 7 preset themes that the panel never offered, so nothing visible is lost.

Checked: lint, typecheck, unit tests and production build pass. In a browser: picked an accent, chart color and floating sidebar, reloaded (kept), then Reset (cookies cleared, default look back), with no console errors.

## #26 Overview: our own stat cards and platform status block (waas-api-mx5.3)

Merged 2026-10-15 · Beads: waas-api-mx5.3

Before: the Overview's four stat cards and the Platform status card were adapted from two paid UI-kit blocks.

After: the page looks the same. Light, dark and phone screenshots match the old page pixel for pixel, apart from the live timestamps. The code underneath is ours.

Part of replacing the paid UI kit so the repo can stay public (Beads epic waas-api-mx5, this PR is waas-api-mx5.3).

How: `StatCard`, `HealthBadge`, `ServiceRow` and `StatusDot` live in `app/(dashboard)/page.tsx`, built on the free shadcn card and badge. Each stat card is now a list item whose "Open" link stretches over the card, so the whole card stays clickable and gets a keyboard focus ring.

Checked: lint, typecheck, unit tests and production build pass.

## #27 Shell: our own sidebar, search and header (waas-api-mx5.4)

Merged 2026-10-15 · Beads: waas-api-mx5.4

Before: the sidebar, its nav and search, the top header and the logo came from the paid UI kit. Pressing ⌘K (or clicking Search) crashed the page.

After: every page looks the same. Screenshots of the keys, team and versions pages match the old ones at about 69 dB PSNR, which is invisible, and the other pages differ only in live timestamps. ⌘K search works again, and the account avatar can now be opened from the keyboard.

Part of replacing the paid UI kit so the repo can stay public (Beads epic waas-api-mx5, this PR is waas-api-mx5.4).

How: the new `components/shell/` folder holds `nav.ts` (one list of nav groups, used by both the sidebar and search), `app-sidebar.tsx`, `command-search.tsx`, `site-header.tsx`, `brand-mark.tsx`, plus the storefront switcher, user menu and Appearance panel moved over from `components/layout/`, which is removed. The search crash was older than this work: the dialog's list wasn't wrapped in `<Command>`. ESLint's vendored-code exception now covers only `components/ui` and `hooks`.

Checked: lint, typecheck, unit tests and production build pass. A browser walkthrough found no console errors across ⌘K search, the icon-collapsed sidebar, the storefront switcher, the user menu and the phone drawer (it closes after you tap a link). The Impeccable detector's only flag is the storefront dots' violet gradient. That's our existing design, so it stays.

## #28 Remove the last UI kit leftovers (waas-api-mx5.5)

Merged 2026-10-15 · Beads: waas-api-mx5.5

Before: the repo still pointed at the paid UI kit. That included its component registry and licence key setting, a README saying the layout came from the kit, and README screenshots of the older dashboard.

After: nothing in the repo refers to the kit. The README credits shadcn/ui (MIT) for `components/ui/` and points to our own `components/shell/`, `components/admin/` and DESIGN.md. Its screenshots show today's dashboard.

This is the last code step of replacing the paid UI kit (Beads epic waas-api-mx5, this PR is waas-api-mx5.5).

How:
- `components.json` loses the kit registry, and `.env.example` loses `SHADCNUIKIT_API_KEY`.
- Every file in `components/ui/` was compared with the free shadcn/ui radix-nova registry. They match apart from icon imports and small fixes of ours. The one exception was the badge's success, info and warning tones, which came in with the kit. They are rewritten as our own and look the same.
- Four unused packages are removed: `@base-ui/react`, `@radix-ui/react-icons`, `@radix-ui/react-visually-hidden` and `@tanstack/react-virtual`. The fonts stay, because the Appearance panel offers them.
- The 14 README screenshots are retaken from sample data.

Checked: lint, typecheck, unit tests and production build pass.

## #29 Drop the last kit mentions from comments and DESIGN.md (waas-api-mx5.6)

Merged 2026-10-15 · Beads: waas-api-mx5.6

Before: three comments and DESIGN.md still mentioned the paid UI kit. DESIGN.md also described the old theme panel and kit presets.

After: nothing in the repo mentions the kit. DESIGN.md describes the Appearance panel as it is today.

This prepares for the move to a new public repo with the kit stripped from history (Beads waas-api-mx5.6).

How: wording-only edits in `next.config.ts`, `scripts/motion/login-motion.mjs` and `DESIGN.md`. No code changes.
