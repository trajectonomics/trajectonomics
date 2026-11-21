# @trajectonomics/docs

Trajectonomics documentation portal (Fumadocs + Astro) served at docs.trajectonomics.com

[![CI](https://github.com/trajectonomics/docs/actions/workflows/ci.yml/badge.svg)](https://github.com/trajectonomics/docs/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Part of the [Trajectonomics](https://github.com/trajectonomics) ecosystem.

---

## About

The Docs Portal: public documentation for the Trajectonomics ecosystem, served at
[`docs.trajectonomics.com`](https://docs.trajectonomics.com/)
(see [issue #1](https://github.com/trajectonomics/docs/issues/1) and
[ADR 0013](./docs/adr/0013-the-portal-is-served-on-its-own-host.md)). This package is a deployed site; it is
never published to npm.

- Static [Astro](https://astro.build) site with [Fumadocs](https://fumadocs.dev) (React islands) and the built-in
  local static search (no external search service, no API key). Pages are authored in `src/content/docs/`.
- Two Tabs: the **Operator tab** (`/cli/`, CLI and quickstart) and the **Contribute tab**
  (`/contribute/`, how to help make the tax rules right). `/` is a Landing Page with one entry for each.
  Old `/developers/` URLs answer 301 redirects into the Contribute tab, and `trajectonomics.com/docs/...`
  answers 301 to the same path on this host (`src/lib/worker/handler.ts`).
- Served by one Cloudflare Worker, `docs`, from one [`wrangler.jsonc`](./wrangler.jsonc): a merge to `main` deploys
  production ([ADR 0007](./docs/adr/0007-main-deploys-production.md)). The public address is the custom domain
  `docs.trajectonomics.com` ([ADR 0013](./docs/adr/0013-the-portal-is-served-on-its-own-host.md)). The router still
  forwards `trajectonomics.com/docs` to this Worker so the old URLs can redirect. Deploys run from this repository's
  CI ([the deploy runbook](../../docs/runbooks/deploy.md)). There is no staging Worker and no `production` branch.

### How URLs resolve

Workers Static Assets serves files by request path, so Astro builds into `dist/` (`base: "/"`,
`outDir: "./dist"`) and the Worker serves `./dist`. `/` is the built Landing Page
(`dist/index.html`), not a redirect, and the build writes no `_redirects` file (it removes a stale one
from an earlier build). `/cli` without the slash reaches `/cli/` through the Worker's
`html_handling: "auto-trailing-slash"`.

### The agent-readable form

Every page also exists as Markdown: `/cli/commands/tx.md` beside `/cli/commands/tx/`, and `/index.md` for the
Landing Page. `/llms.txt` is the index that lists them all, and a page URL answers `Accept: text/markdown` with its
twin, served by the Worker (`Vary: Accept` on both forms). The twin is the authored page with its links made absolute;
`verify:build` fails a built site where a page, its twin or its index entry is missing
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

# Develop with hot reload (http://localhost:4321/)
bun run dev

# Build, then serve dist/ exactly as the Worker does (http://localhost:8787/)
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
