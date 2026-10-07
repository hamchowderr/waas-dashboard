# waas-dashboard

Admin dashboard for the WaaS platform. It reads the provisioning API ([`waas-provisioning-api`](https://github.com/hamchowderr/waas-provisioning-api)) and shows:

- **Overview**: whether the API, its database and its job queue are up, store counts by status, queued and failed background jobs, backup totals.
- **Stores**: every store (tenant) across all storefronts, with storefront, version, domains, status and last backup. Each store has a page with its domains, backups, settings names and jobs.
- **Jobs**: queued, running and failed background jobs, with the error of each failed one.
- **Backups**: every backup, including those of deleted stores, with when each expires.
- **Versions & templates** (per storefront; replaces the old WPCS console): list versions and templates, create a version from a base template or an uploaded archive (copying group templates into it), make a version production, delete versions and templates, and upload templates. Making a version production and every delete ask for confirmation first.
- **Retry** failed jobs, one from its detail dialog or several at once from the Jobs list.

The storefront switcher in the header narrows the pages to one storefront (`?product=<id>` in the URL).

Changes to stores themselves (suspend, resume, backup, restore, domains) are not in the dashboard yet.

Next.js 16 (App Router), React 19, Tailwind CSS v4 and the [Shadcn UI Kit](https://shadcnuikit.com) dashboard shell and pages. Hosted on Vercel.

![Overview](docs/screenshots/1-overview.png)

## How it gets its data

All API calls run on the server (`lib/api/`). The browser never sees the API address or the admin token. Changes go through server actions (`app/(dashboard)/actions.ts`), and each one checks the signed-in user against the allowlist itself, because a server action can be called directly.

Archives (version and template uploads) are the exception: the API returns an upload address, and the browser sends the file straight to it with one `PUT`, as WPCS did. The storage behind those addresses has to accept cross-origin `PUT`s from the dashboard's address (a CORS rule on the bucket) once a real store host is chosen; the fake provisioner's addresses accept nothing.

| Source | When |
|---|---|
| The live API's `/admin/*` endpoints, with `Authorization: Bearer $WAAS_ADMIN_TOKEN` | `WAAS_API_URL` and `WAAS_ADMIN_TOKEN` are set |
| Built-in sample data (`lib/api/fixtures.ts`), with a "Sample data" badge in the header | `WAAS_API_FIXTURES=1` |

With neither, pages show an error rather than sample data, so a missing variable is never mistaken for real data.

`lib/api/wire.ts` mirrors the API's `openapi/admin/admin-api.yaml` (beads `waas-api-plu.1` and `waas-api-plu.3`; the version and template endpoints take the WPCS operations' bodies). `lib/api/http.ts` maps those bodies to the page types in `lib/api/types.ts`, and adds the store and storefront names that the backups and jobs lists carry only as ids. Lists are read whole (up to 2,000 rows each, in pages of 200) and filtered in the browser.

## Sign-in

[Auth.js](https://authjs.dev) with GitHub. Only the GitHub logins in `ALLOWED_GITHUB_LOGINS` can sign in, and the list is checked on every request, so removing a login locks it out straight away. Sessions are signed cookies (12 hours); there is no user database.

To set it up, create a GitHub OAuth app (GitHub → Settings → Developer settings → OAuth Apps → New OAuth App):

| Field | Value |
|---|---|
| Homepage URL | the dashboard's address, e.g. `https://waas-dashboard.vercel.app` |
| Authorization callback URL | the same address + `/api/auth/callback/github` |

Its Client ID goes in `AUTH_GITHUB_ID` and a generated client secret in `AUTH_GITHUB_SECRET`. GitHub allows one callback URL per OAuth app, so local development needs a second OAuth app with `http://localhost:3000` and `http://localhost:3000/api/auth/callback/github`.

## Environment variables

| Name | Needed for | Notes |
|---|---|---|
| `WAAS_API_URL` | live data | e.g. `https://waas-api.otakusolutions.io` |
| `WAAS_ADMIN_TOKEN` | live data | the API's `ADMIN_TOKEN`; server-side only |
| `WAAS_API_FIXTURES` | sample data | `1` to use the built-in sample data |
| `AUTH_SECRET` | sign-in | random, e.g. `openssl rand -base64 32` |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | sign-in | from the GitHub OAuth app |
| `ALLOWED_GITHUB_LOGINS` | sign-in | GitHub usernames, comma separated |
| `SHADCNUIKIT_API_KEY` | adding kit components | development only, see below |

`.env.example` lists them. Vercel reads its variables when it builds, so a changed variable takes effect on the next deployment.

## Develop

```sh
npm install
cp .env.example .env.local   # fill in, or set WAAS_API_FIXTURES=1
npm run dev
```

Checks (CI runs the same on every pull request):

```sh
npm run typecheck
npm run lint
npm run build
```

## Shadcn UI Kit

The layout (`components/layout/`, `components/theme-customizer/`) is the kit's Dashboard Shell. The tables (`components/admin/data-table.tsx`) are adapted from the kit's Orders page and use its filter builder (`components/ui/filters/`). The Overview uses the kit's stat-card5 and chart39 blocks. Kit and shadcn/ui files are kept as shipped where possible, so `eslint.config.mjs` relaxes a few rules for those folders only.

Fonts are local files from `@fontsource` loaded with `next/font/local` (`lib/fonts.ts`), never `next/font/google`: Turbopack intermittently fails builds on the CSS Google serves for a font, and a local file needs no network at build time.

`components.json` has the kit's private registry. With `SHADCNUIKIT_API_KEY` in the environment:

```sh
npx shadcn@latest add @shadcnuikit/<name>
```

The key is only needed to add components; builds don't use it. Never commit the key, or any install link the kit's MCP server returns (they carry a token).

## Sign-in motion

The sign-in page shows a looping animation of a storefront being set up and going live (`components/admin/login-motion.tsx`). It is a Lottie file in a light and a dark version, `public/motion/login-{light,dark}.json` (about 19 KB each), built by `node scripts/motion/login-motion.mjs` with the [text-to-lottie](https://github.com/diffusionstudio/lottie) skill's conventions and checked in its Skottie player. The `.webp` stills next to them are frame 200, rendered from the JSON with lottie-web; after changing the animation, render them again.

The still is in the server-rendered page, so there is no layout shift and it works without JavaScript. The animation replaces it once the page is idle, only on screens wide enough to show the panel, and never with "reduce motion" turned on. `proxy.ts` lets `/motion/*` through without a session, because the sign-in page needs it before anyone is signed in.

## Screenshots

From a local run with sample data:

| | |
|---|---|
| ![Sign in](docs/screenshots/0-login.png) | ![Sign in, dark](docs/screenshots/0-login-dark.png) |
| ![Stores](docs/screenshots/2-stores.png) | |
| ![Store](docs/screenshots/3-store-detail.png) | ![Failed jobs](docs/screenshots/4-jobs.png) |
| ![Backups](docs/screenshots/5-backups.png) | ![Versions](docs/screenshots/7-versions.png) |
| ![New version](docs/screenshots/8-new-version-dialog.png) | ![Make production](docs/screenshots/9-confirm-production.png) |
| ![Templates](docs/screenshots/11-templates.png) | ![Upload a template](docs/screenshots/12-upload-template-dialog.png) |
| ![Retry one job](docs/screenshots/13-job-retry-dialog.png) | ![Retry several](docs/screenshots/14-jobs-bulk-retry.png) |
