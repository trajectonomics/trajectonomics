# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to `apps/site`, the Site at the root of trajectonomics.com.

## Rules

1. Design: keep the built-file checks in `src/lib/build/` and the probe check in `src/lib/probe/` pure (data in, data out, no I/O). Node, filesystem and network access lives in `scripts/`. The Site ships static HTML and CSS: no React, no Fumadocs, no client-side router ([ADR 0002](docs/adr/0002-site-worker-with-static-assets.md)).
2. Done means `bun run check` passes in `apps/site`: Biome lint with zero warnings, strict typecheck, tests, the Astro build, the built-file checks and the local Worker probe. Do not loosen `tsconfig.base.json` or `biome.json` to make an error go away.
3. The Site is never published to npm: do not add a release workflow or a publish surface.
4. Subagents do the work on a work model: **`deepseek-v4.1-flash`** (Pi). The expensive models (`claude-*`, `gemini-*`, `grok-*`) are for consultation, review and debugging help only, never for routine implementation. The exception runs from 2026-11-25 until the owner says otherwise: DeepSeek and Muse are both unavailable, so `claude-haiku-5-5` does the work, then `claude-sonnet-5-5` when Haiku cannot finish (root `AGENTS.md`, "Claude is the work model for now"). **Mistral Vibe (`mistral-vibe` / `mistral-large-4`) is retired** as of 2026-11-21 and is no longer a work model ([trajectonomics/factory ADR 0027](https://github.com/trajectonomics/factory/blob/main/docs/adr/0027-reviews-run-on-hydrogen-and-grok.md)).
