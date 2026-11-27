# @trajectonomics/docs

Trajectonomics documentation portal (Fumadocs + Astro) served at trajectonomics.com/docs/

[![CI](https://github.com/trajectonomics/trajectonomics/actions/workflows/ci.yml/badge.svg)](https://github.com/trajectonomics/trajectonomics/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Part of the [Trajectonomics](https://github.com/trajectonomics) ecosystem.

---

## About

The Docs Portal: public documentation for the Trajectonomics ecosystem, served at
[`trajectonomics.com/docs/`](https://trajectonomics.com/docs/)
(see [ADR 0017](./docs/adr/0017-the-portal-is-served-under-the-sites-host.md)). This package is a deployed site; it is
never published to npm.

- Static [Astro](https://astro.build) site with [Fumadocs](https://fumadocs.dev) (React islands) and the built-in
  local static search (no external search service, no API key). Pages are authored in `src/content/docs/`.
- Two Tabs: the **Operator tab** (`/docs/cli/`, CLI and quickstart) and the **Contribute tab**
  (`/docs/contribute/`, how to help make the tax rules right). `/docs/` is a Landing Page with one entry for each.
  Old `/docs/developers/` URLs answer 301 redirects into the Contribute tab, and the retired Docs host
  answers 301 to the same path under `/docs/` (`src/lib/worker/handler.ts`).
- Served by one Cloudflare Worker, `docs`, from one [`wrangler.jsonc`](./wrangler.jsonc): a merge to `main` deploys
  production ([ADR 0007](./docs/adr/0007-main-deploys-production.md)). The Worker declares the zone route
  `trajectonomics.com/docs*`, so its assets own the Site's `/docs` mount; it keeps the old custom domain
  only to redirect it ([ADR 0017](./docs/adr/0017-the-portal-is-served-under-the-sites-host.md)).
  There is no router Worker. Deploys run from this repository's CI
  ([the deploy runbook](../../docs/runbooks/deploy.md)). There is no staging Worker and no `production` branch.

### How URLs resolve

Workers Static Assets serves the root of the build under the public prefix: Astro's `base` is `/docs`,
`outDir` is `./dist`, and `assets.base_path` is `/docs`, so `/docs/` is `dist/index.html` and
`/docs/cli/` is `dist/cli/index.html`. The Worker runs first for every request (`run_worker_first: true`):
it answers the old host and retired paths with 301s, answers `Accept: text/markdown` with the page's twin, and
forwards everything else to the assets. `/docs/cli` without the slash reaches `/docs/cli/` through
`html_handling: "auto-trailing-slash"`, and a miss under `/docs/` answers the built 404 page.

The Site owns the host root: its `robots.txt`, IndexNow key and root favicon are outside this package. The
Portal's Sitemap stays at [`/docs/sitemap.xml`](https://trajectonomics.com/docs/sitemap.xml), and the Site's
`robots.txt` names it.

### The agent-readable form

Every page also exists as Markdown: `/docs/cli/commands/tx.md` beside `/docs/cli/commands/tx/`, and
`/docs/index.md` for the Landing Page. `/docs/llms.txt` is the index that lists them all, and a page URL
answers `Accept: text/markdown` with its twin, served by the Worker (`Vary: Accept` on both forms). The twin is
the authored page with its links made absolute under `/docs`; `verify:build` fails a built site where a page,
its twin or its index entry is missing
([ADR 0010](./docs/adr/0010-the-portal-serves-markdown-by-request.md)).

---

## Development

Requires Bun and Node 22.23.4 or later (Astro; `.node-version` pins 24).

```bash
# Install dependencies
bun install

# Run the full verification suite (lint, typecheck + astro check, tests, build, built Docs Portal check)
bun run check

# Check the built Docs Portal in dist/ on its own (the last step of bun run check)
bun run verify:build

# Run the browser tests against the built site (Chromium)
bunx playwright install chromium
bun run test:e2e

# Develop with hot reload (http://localhost:4321/docs/)
bun run dev

# Build, then serve dist/ exactly as the Worker does (http://localhost:8787/docs/)
bun run preview

# Run the unit tests (no build needed)
bun run test

# Record the latest published traj release in src/generated/cli-release.json (needs the network).
# bun test checks every Operator page against that snapshot; --version X.Y.Z pins another release.
bun run snapshot:cli

# Run every `bash exec` example against a traj binary (the Docs examples job uses the snapshot's release)
bun run check:examples --traj ~/.local/bin/traj

# Compare the command reference with npm's latest instead of the snapshot (needs the network)
bun run check:command-reference

# Code formatting & lint
bun run format
bun run lint
```

`typescript` is pinned to 6.0.x because `astro check` does not support TypeScript 7 yet.

---

## Domain Documentation

- [GLOSSARY.md](./GLOSSARY.md): Ubiquitous domain terminology.
- [AGENTS.md](./AGENTS.md): Guidelines and rules for autonomous AI coding agents.
- [CODING_STANDARDS.md](./CODING_STANDARDS.md): Architecture, purity, and review invariants.
- [docs/adr/](./docs/adr/): Architecture Decision Records.

---

## License

[MIT](./LICENSE)
