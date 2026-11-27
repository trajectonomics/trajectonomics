# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to
`apps/auth`, the `auth` Worker at auth.trajectonomics.com and the D1 database `traj-auth`.

## Rules

1. `traj-auth` holds people: the Better Auth `user`, `account`, `session`, `passkey`, `jwks`,
   OAuth client/token and `deviceCode` tables, and later the marketing consent record. `traj-data`
   never holds an email or a name; it keeps numbers and the auth user id only.
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
   regenerating `0003`. Deployment is not wired yet; when the auth app joins the deploy workflow,
   it must apply the migrations before deploying the Worker.
6. The dev-only email + password path exists for the spike's test user only. It needs
   `ENVIRONMENT=development`, `DEV_ONLY=true` and a loopback `BETTER_AUTH_URL`; production config
   can satisfy none of the three.
7. No secret in the repository: client ids and secrets are Worker secrets, and `.dev.vars` is
   untracked. `.dev.vars.example` holds placeholders only.
8. Gate 1 and gate 3 are closed by `src/oauth/hooks.ts`: a request may carry one `resource` at most,
   read from the query, the raw body (exact media type, so a lying `Content-Type` cannot hide a JSON
   array) and `ctx.body`, and a refresh may not add a resource the grant did not have. `grant_type`
   is trimmed as Better Auth trims it, and a padded value is rejected with `invalid_request` so it
   cannot skip the refresh checks. Every OAuth client is seeded from `src/core/clients.ts` and
   linked to exactly one resource. `clientPrivileges` is always closed and
   `enforcePerClientResources` is always on; never relax either.
9. Done means `bun run check` passes here: Biome with zero warnings, `tsc`, the unit tests and
   `wrangler deploy --dry-run`. The spike (`bun run spike`) starts its own local Worker and is not
   part of `check`.
10. The owner's wrangler login sees two Cloudflare accounts, so any non-interactive wrangler command
    for this Worker sets `CLOUDFLARE_ACCOUNT_ID` to the Trajectonomics account. Look its id up with
    `wrangler whoami`; never hard-code it in this repository. The five Worker secrets
    (`BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`,
    `GITHUB_CLIENT_SECRET`) are already set in Cloudflare.
