# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to
`apps/auth`, the `auth` Worker at auth.trajectonomics.com and the D1 database `traj-auth`.

## Rules

1. `traj-auth` holds people: the Better Auth `user`, `account`, `session`, `passkey`, `jwks`,
   OAuth client/token and `deviceCode` tables, the append-only `marketingConsent` history and the
   `pendingDeletion` notification queue. `traj-data` never holds an email or a name; it keeps
   numbers and the auth user id only.
2. Every auth pull request is reviewed by a model different from the one that wrote it. Say which
   model wrote the diff and which one reviewed it in the PR body.
3. Better Auth is pinned to one exact stable version in `package.json` and in the migration header.
   No beta, canary or RC API, and no `^` or `~` on the Better Auth packages.
4. `src/core/` is pure: dev-mode gating, path rewriting, token/claim descriptions, the resource
   list, the client manifest and the OAuth decision rules take their inputs as arguments. Better
   Auth, D1 and `fetch` stay outside `src/core/`: `src/auth*.ts`, `src/oauth*.ts`, `src/oauth/`,
   `src/worker.ts` and `scripts/`.
5. `migrations/` is generated, never hand-edited. `0001_init.sql` is history and is never
   rewritten. A schema change is a new numbered file:
   `bun run schema -- --out migrations/<n>_<name>.sql --only <table>`. The first-party OAuth
   clients are generated from `src/core/clients.ts` with `bun run clients:sql` into
   `0003_oauth_clients.sql`. `0003` is one-shot: the generator refuses to overwrite it, and
   `src/core/clients-migration.test.ts` compares it with the generator's output. A later manifest
   change ships as a new numbered migration with explicit `update`/`insert` statements, never by
   regenerating `0003`. `0004_marketing_consent.sql` and `0005_pending_deletion.sql` are generated
   the same way from the two account plugins. `0006_marketing_consent_language.sql` is the one
   additive statement a later column needs: the generator only prints `create table` for a fresh
   database, so a column added to a table an earlier migration created is one `alter table` in a new
   file. `src/migrations.test.ts` applies every migration in order and fails when the result misses a
   column a plugin declares. Deployment is not wired yet; when the auth app joins the deploy
   workflow, it must apply the migrations before deploying the Worker.
6. The dev-only email + password path exists for the spike's test user only. It needs
   `ENVIRONMENT=development`, `DEV_ONLY=true` and a loopback `BETTER_AUTH_URL`; production config
   can satisfy none of the three.
7. No secret in the repository: client ids and secrets are Worker secrets, and `.dev.vars` is
   untracked. `.dev.vars.example` holds placeholders only.
8. Gate 1 and gate 3 are closed by `src/oauth/hooks.ts`: a request may carry one `resource` at most,
   read from the query, the raw body (exact media type, so a lying `Content-Type` cannot hide a JSON
   array) and `ctx.body`, and a refresh may not add a resource the grant did not have. A body the
   hook cannot read fails closed. `/oauth2/authorize` accepts GET only: its POST body is parsed
   before the hook, so a repeated `resource` would collapse. `/device/code` accepts only the exact
   form media type and a non-empty scope. A device consent is recorded in the `/device/approve`
   before-hook, before the code becomes redeemable. `grant_type` is trimmed as Better Auth trims it,
   and a padded value is rejected with `invalid_request` so it cannot skip the refresh checks. Every
   OAuth client is seeded from `src/core/clients.ts` and linked to exactly one resource.
   `clientPrivileges` is always closed and `enforcePerClientResources` is always on; never relax
   either.
9. Done means `bun run check` passes here: Biome with zero warnings, `tsc`, the unit tests and
   `wrangler deploy --dry-run`. The spike (`bun run spike`) starts its own local Worker and is not
   part of `check`.
10. The owner's wrangler login sees two Cloudflare accounts, so any non-interactive wrangler command
    for this Worker sets `CLOUDFLARE_ACCOUNT_ID` to the Trajectonomics account. Look its id up with
    `wrangler whoami`; never hard-code it in this repository. The five Worker secrets
    (`BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`,
    `GITHUB_CLIENT_SECRET`) are already set in Cloudflare.

## The pages

1. The person-facing pages are Astro with Svelte 5 islands, built into `dist-site` and served by the
   Worker's `assets` binding. The Worker runs first only for `/api/*`, `/jwks` and `/.well-known/*`;
   every other path is a static asset (ADR 0003). `/` is a client redirect because a static asset
   cannot read the session.
2. `src/lib/` is pure and tested with `bun test`: paths, the `?next=` rule, scope words, dates, the
   language dictionary. `src/client/auth.ts` is the only module that creates or calls the Better
   Auth client; `src/client/account.ts` and `src/client/oauth.ts` go through its `request` helper.
   `<script>` in an island never calls `createAuthClient` itself.
3. English is at `/` and Thai under `/th/`, from one typed dictionary. Both trees have every page,
   the dictionary test fails a missing key, and `Header.astro`'s inline script completes the language
   links with `location.search` and `location.hash`, so a signed OAuth query or `user_code` survives
   a switch in a static build. The Thai legal page says the English text is official.
4. Every page paints from `--ds-*` roles and renders the shared `@trajectonomics/site-header`; the
   colour-literal test is the guard. No page has an intro sentence, and each has one focal point and
   at most one primary action.
5. `?next=` is a same-origin path only (`src/lib/next.ts`). Never pass it to `location.assign` before
   that check.
6. `marketingConsent` is append-only: a new answer is a new row, and withdrawing stamps
   `withdrawnAt` on every open opted-in row in the same `DB.batch` as the new answer, so one write
   cannot land without the other. A row also keeps the `language` the person read and the
   `wordingVersion` they agreed to, and the account page quotes the sentence that version stands for
   (`src/lib/consent-wording.ts`). Never update or delete an earlier answer by hand; a wording
   change is a new `wordingVersion`. The rows cascade when the account is deleted.
7. Account deletion queues its `pendingDeletion` row in `beforeDelete`, so a failed insert aborts the
   deletion instead of losing the notice. `afterDelete` then deletes the rows that can still name the
   id (`deviceCode`, and the `verification` rows holding an authorization code or a passkey
   challenge) and calls the data Worker once; a failure is recorded on the row. The `DATA` service
   binding is optional on purpose. The cron reads at most twenty-five rows whose `nextAttemptAt` is
   due, oldest first, which keeps one tick under Cloudflare's limit of 32 Worker invocations per
   request. It skips a row whose user still exists, so a live account is never reported. A failed
   attempt moves `nextAttemptAt` forward (five minutes, doubling, capped at a day), so no failing row
   starves a newer one. Acknowledged notices are deleted thirty days after the data site confirms.
   The timing is pure in `src/core/deletion.ts`. The data endpoint is issue #601's, not this app's.
8. `bun run test:e2e` builds the pages, migrates a scratch D1 database under `~/.cache`, starts
   `wrangler dev --local` and runs Playwright; it never reaches the owner's Cloudflare account.
   `test:e2e` also runs axe at 360 px and 1280 px, in light and dark, in both languages, checks every
   page's security headers and that no page scrolls sideways at either width, and writes the pull
   request's screenshots to `e2e/screenshots/`. A new page adds itself to the review list.
9. Done still means `bun run check` here; for a page change it also means `bun run test:e2e` passes.
