# WaaS Dashboard

The admin dashboard for the [WaaS provisioning API](https://github.com/hamchowderr/waas-provisioning-api): one place to see and manage every customer website the API runs, across all your storefronts. It is the dashboard behind [AnyPress](https://anypress.io) and is open source under GPL-3.0.

![Overview](docs/screenshots/1-overview.png)

## What you can do

- **Overview:** whether the API, its database and its job queue are up, website counts by status, queued and failed jobs, backup totals.
- **Stores:** every customer website, with its storefront, version, domains, status and last backup. Each website has its own page, where you can:
  - **Change address:** make another domain the website's main address. The old one keeps redirecting.
  - **Email sender:** let the website send email from its owner's own domain, with the DNS records to add and whether they're verified. Where the domain's DNS host supports Domain Connect, **Connect automatically** adds the records for them.
  - **Restore** a backup: roll the live website back to it, after first backing up what it holds now.
- **Jobs:** queued, running and failed background jobs, with each failure's error. **Retry** one, or several at once.
- **Backups:** every backup, including nightly ones and those of deleted websites, with when each expires.
- **Versions & templates** (per storefront): create a version from a template or an uploaded archive, make a version production, upload and delete templates. Making a version production and every delete ask first.

The storefront switcher in the header narrows every page to one storefront. Suspending, resuming, a manual backup and deleting a website happen from the storefront, not here.

## Set it up

You need a running provisioning API with `ADMIN_TOKEN` set, and a GitHub account for each person who should sign in.

1. **Create a GitHub App for sign-in.** GitHub → Settings → Developer settings → GitHub Apps → New GitHub App. Set the callback URL to `https://<your dashboard>/api/auth/callback/github` (a GitHub App can hold several, so add `http://localhost:3000/api/auth/callback/github` too for local work). Turn the webhook off; no permissions are needed. Generate a client secret. (A GitHub OAuth app works as well, with one callback URL per app.)
2. **Deploy.** Vercel works out of the box (import the repo). Any host with Node 22 or newer works too: `npm ci && npm run build && npm start`, with `AUTH_TRUST_HOST=true` set so sign-in accepts your address.
3. **Set the environment variables** below, then redeploy (Vercel reads them when it builds).
4. **Allow uploads.** Archive uploads go from the browser straight to the API's storage bucket, so add a CORS rule on the bucket allowing `PUT` from the dashboard's address.

| Name | Needed for | Notes |
|---|---|---|
| `WAAS_API_URL` | live data | the API's address, e.g. `https://api.example.com` |
| `WAAS_ADMIN_TOKEN` | live data | the API's `ADMIN_TOKEN`; server-side only |
| `AUTH_SECRET` | sign-in | random, e.g. `openssl rand -base64 32` |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | sign-in | the GitHub App's Client ID and client secret |
| `ALLOWED_GITHUB_LOGINS` | sign-in | GitHub usernames allowed in, comma separated |
| `AUTH_TRUST_HOST` | sign-in off Vercel | `true` on any host other than Vercel |
| `WAAS_API_FIXTURES` | sample data | `1` to show built-in sample data instead of the API |

`.env.example` lists them. Only the logins in `ALLOWED_GITHUB_LOGINS` can sign in, and the list is checked on every request, so removing a login locks it out straight away. Sessions are signed cookies lasting 12 hours; there is no user database.

To run the whole platform yourself (API, storefront and dashboard), see the API's [self-hosting guide](https://github.com/hamchowderr/waas-provisioning-api/blob/main/docs/self-hosting.md).

## Development

Next.js 16 (App Router), React 19, Tailwind CSS v4, Auth.js.

```sh
npm install
cp .env.example .env.local   # fill in, or set WAAS_API_FIXTURES=1 to use sample data
npm run dev
```

Checks (CI runs the same on every pull request):

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

### How it gets its data

All API calls run on the server (`lib/api/`). The browser never sees the API address or the admin token. Changes go through server actions (`app/(dashboard)/actions.ts`), and each one checks the signed-in user against the allowlist itself, because a server action can be called directly.

Archives (version and template uploads) are the exception: the API returns an upload address, and the browser sends the file straight to it with one `PUT`, as WPCS did. The bucket behind those addresses has to accept cross-origin `PUT`s from the dashboard's address, so it needs a CORS rule allowing `PUT` from it. With the API's fake provisioner the addresses are placeholders and accept nothing.

| Source | When |
|---|---|
| The live API's `/admin/*` endpoints, with `Authorization: Bearer $WAAS_ADMIN_TOKEN` | `WAAS_API_URL` and `WAAS_ADMIN_TOKEN` are set |
| Built-in sample data (`lib/api/fixtures.ts`), with a "Sample data" badge in the header | `WAAS_API_FIXTURES=1` |

With neither, pages show an error rather than sample data, so a missing variable is never mistaken for real data.

`lib/api/wire.ts` mirrors the API's `openapi/admin/admin-api.yaml` (the version and template endpoints take the WPCS operations' bodies). `lib/api/http.ts` maps those bodies to the page types in `lib/api/types.ts`, and adds the store and storefront names that the backups and jobs lists carry only as ids. Lists are read whole (up to 2,000 rows each, in pages of 200) and filtered in the browser.

Every page works on phones and tablets: lists turn into cards below 1024px wide.

Fonts are local files from `@fontsource` (`lib/fonts.ts`), so builds need no network for fonts.

The layout, tables and overview cards come from the [Shadcn UI Kit](https://shadcnuikit.com) (`components/layout/`, `components/theme-customizer/`, `components/ui/filters/`). Adding kit components needs a kit licence key in `SHADCNUIKIT_API_KEY`; building and running don't.

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

## License

GPL-3.0-or-later for this project's own code. See [LICENSE](LICENSE). Parts taken from the Shadcn UI Kit (the layout, tables and overview cards) stay under the kit's own license.
