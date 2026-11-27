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
4. `src/core/` is pure: dev-mode gating, path rewriting and token/claim descriptions take their
   inputs as arguments. Better Auth, D1 and `fetch` stay in `src/auth.ts`, `src/worker.ts` and
   `scripts/`.
5. `migrations/` is generated from the auth options with `bun run schema`; never hand-edit it. A
   schema change is a new numbered migration. Deployment is not wired yet; when the auth app joins
   the deploy workflow, it must apply the migrations before deploying the Worker.
6. The dev-only email + password path exists for the spike's test user only. It needs
   `ENVIRONMENT=development`, `DEV_ONLY=true` and a loopback `BETTER_AUTH_URL`; production config
   can satisfy none of the three.
7. No secret in the repository: client ids and secrets are Worker secrets, and `.dev.vars` is
   untracked. `.dev.vars.example` holds placeholders only.
8. Every OAuth client is linked to exactly one resource until a before-hook rejects multi-resource
   requests and resource widening on refresh (ADR 0001, known gap). Never relax `clientPrivileges`
   or `enforcePerClientResources` outside the dev sign-in gate.
9. Done means `bun run check` passes here: Biome with zero warnings, `tsc`, the unit tests and
   `wrangler deploy --dry-run`. The spike (`bun run spike`) starts its own local Worker and is not
   part of `check`.
