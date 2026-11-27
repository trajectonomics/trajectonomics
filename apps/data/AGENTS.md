# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to
`apps/data`, the data app at trajectonomics.com/data/: the static site, the `data` Worker that
serves it, and the nested `collector/` package. The old host still answers the API and ingest and
redirects its pages (ADR 0006).

## Rules

1. Stats only leave the machine. The collector prints plan, model, UTC bucket and numbers; it
   never prints or commits prompts, session titles, project names, paths, account ids or times of
   day. Never commit a real log, a real collector output or a hostname.
2. `apps/data/collector/src/extract/` and `src/aggregate.ts` are pure: data in, data out, no `fs`,
   no SQLite, no network, no clock. File and database access stays in `src/cli.ts`,
   `src/collect.ts` and `src/stores/`.
3. Every test fixture is synthetic and hand-written. Never copy a line from a real store into a
   test, a doc, a commit message or a pull request.
4. No prices in slice 1. A price enters the plan table only with a dated public source, in a later
   slice.
5. A multiplier for a plan tier enters the catalogue only with a dated public source: a URL, the day
   it was read, and an exact quote. The catalogue lives in `collector/src/tier-catalog.ts`; a
   multiplier is never inferred from a price or a neighbouring tier.
6. Cursor is counted from exactly one source per run: its SDK store when `usage_json` is populated,
   else the T3 Code `cursor` logs. Never both.

## The site

1. The static pages are Astro (`src/pages`, `src/layouts`) with Svelte 5 islands (`src/components`, `src/client`). `astro build` writes `dist/`, which wrangler serves at `/data/` through `assets.base_path`; the brand fonts and Favicon Set are copied into `public/` before a build and are never committed.
2. `src/lib/` is pure and tested with `bun test`: data in, data out, no clock, no `fetch`, no DOM. `src/client/api.ts` is the only module that calls `fetch`; a component renders what the pure functions give it.
3. No colour literal: paint from the brand's Theme roles (`--ds-color-*`). `colour-literals.test.ts` fails any literal in a stylesheet, an Astro file or a Svelte component.
4. Data never bakes into the build (ADR 0001). The pages fetch the read API in the browser, so a new ingest needs no rebuild.
5. Done means `bun run check` passes here: Biome with zero warnings, `tsc` for the Worker and the site, `astro check`, the tests, the Astro build and the Worker dry run.

## The Worker

1. `traj-data` never holds an email or a name. It holds contributor ids, plan and model ids, UTC
   buckets, numbers, and the auth user id on `contributor`.
2. The public API serves aggregates, never a stored row: `rollup_daily` for the usage read, and
   `usage_hourly` summed per plan and bucket for the peaks (ADR 0007). No response carries a
   machine, a contributor or an hourly bucket.
3. `/data/ingest` (and the old host's `/ingest`) authenticates with the temporary
   `INGEST_BOOTSTRAP_KEY` secret. The contributor comes from the key, never from the body; a row
   that names another contributor is rejected.
4. `src/core/` is pure: validation, rollups, query parsing, health and host/path routing take their
   inputs as arguments. D1 stays in `src/db/`, HTTP in `src/http/`.
5. Data never triggers a rebuild (ADR 0001). Ingest recomputes rollups in D1; the pages and the API
   are served by the deployed Worker.
6. An ingest batch is all-or-nothing: the whole body is validated before anything is written, and
   the upserts plus each affected day's SQL rollup rebuild share one `DB.batch` (one D1 query).
7. The schema changes only through numbered files in `migrations/`; the deploy workflow applies
   them before deploying the Worker.
