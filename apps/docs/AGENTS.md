# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to `apps/docs` (`@trajectonomics/docs`).

## Rules

1. Bun only, with one exception: `bun run test:e2e` runs Playwright on Node through its own bin ([ADR 0004](./docs/adr/0004-browser-tests-run-outside-the-deploy-gate.md)).
2. Cloudflare credentials live in Cloudflare (Workers Builds), never in this repo or in GitHub secrets.
3. Done means `bun run check` passes in `apps/docs` (Biome lint with zero warnings, strict typecheck plus `astro check`, tests, Astro build, then the built Docs Portal check `verify:build`), and the `e2e` browser job is green in CI (advisory until the owner makes it a required check, trajectonomics/infra#32). Do not loosen `tsconfig.base.json` or `biome.json` to make an error go away.
4. This is a deployed site, never published: never edit `version` in `package.json`, never run `npm publish`, and keep `private: true`. A merge to `main` deploys production, the single Worker `docs` ([ADR 0007](./docs/adr/0007-main-deploys-production.md)); there is no staging Worker and no `production` branch, do not create either. Deploys go through Workers Builds, whose build command runs `bun run check` (see ADR 0003); do not add a GitHub Actions deploy workflow.

## Planning

Every plan and issue states goals and non-goals; user-facing work adds a Surface & design section. See [`docs/agents/planning.md`](./docs/agents/planning.md).
