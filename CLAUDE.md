# WaaS dashboard: agent guide

@AGENTS.md

The AnyPress dashboard (app.anypress.io): a Next.js app that manages everything the provisioning API runs. It has no database of its own; every read and write goes through the API, which also runs sign-in (Better Auth, passed through at `/api/auth/*`) and decides what each person may see.

- Before pushing, run what CI runs: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- The look is in `DESIGN.md` (quiet, neutral, data-first, shadcn/ui components in `components/`). Follow its tokens; don't add colours or a second component kit.
- A change that needs a new API route goes into `waas-provisioning-api` first (with its OpenAPI entry), then here.
- Merging doesn't always reach app.anypress.io: after a merge, check the live deployment is on the new commit.

## Rules for every change

- **Beads, every time.** Each piece of work gets a Beads issue before it starts (check for a duplicate first). Put the id in the branch, the PR and the status, and close the issue when the PR merges or the change is live. Run `bd` in the session doing the work; the SessionStart hook in `.claude/settings.json` loads the Dolt login, then `bd dolt push` syncs it. This repository's issues are in DoltHub `chowderr/waas (ids `waas-*`); API-side work uses `waas-api-*` in chowderr/waas_api`.
- **Pull requests:** open them ready for review, not as drafts, so CI runs. Merge a PR yourself once CI is green and the work was asked for.
- **No "WPCS" wording.** The old platform is gone. Say "the AnyPress API" or "the API's key and secret login". Don't add the word anywhere; existing identifiers that live sites depend on (plugin slugs such as `wpcs-waas-host`, update URLs) stay until a planned migration.
- **Public docs are for users.** READMEs and `docs/` explain how to use and run the code. Internal notes (server and Coolify ids, Beads, deployment steps) go in the obsidian-vault repository under `1. Projects/WaaS/`. Never put how or why AnyPress started in public copy.
- **Verify before claiming.** Check npm, wordpress.org or the official docs before calling a version or spec "the latest", and check a fix on the running system before calling it fixed.
