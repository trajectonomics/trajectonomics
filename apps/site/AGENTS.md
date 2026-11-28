# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to `apps/site`, the Site at the root of trajectonomics.com.

## Rules

1. Design: keep the built-file checks in `src/lib/build/` and the probe check in `src/lib/probe/` pure (data in, data out, no I/O). Node, filesystem and network access lives in `scripts/`. The Site ships static HTML and CSS: no React, no Fumadocs, no client-side router ([ADR 0002](docs/adr/0002-site-worker-with-static-assets.md)).
2. Done means `bun run check` passes in `apps/site`: Biome lint with zero warnings, strict typecheck, tests, the Astro build, the built-file checks and the local Worker probe. Do not loosen `tsconfig.base.json` or `biome.json` to make an error go away.
3. The Site is never published to npm: do not add a release workflow or a publish surface.
4. Subagents do the work on a work model: **`deepseek-v4.1-flash`**, on OpenCode Go (`opencode-go/deepseek-v4.1-flash`) or Pi. The expensive models (`claude-*`, `gemini-*`, `grok-*`) are for consultation, review and debugging help only, never for routine implementation. **Mistral Vibe (`mistral-vibe` / `mistral-large-4`) is retired** as of 2026-11-21 and is no longer a work model ([trajectonomics/factory ADR 0027](https://github.com/trajectonomics/factory/blob/main/docs/adr/0027-reviews-run-on-hydrogen-and-grok.md)).
5. A new workspace dependency of the Site must also be added to the hand-written dependency lists in `apps/site/turbo.json`.
6. The visual baselines in `e2e/visual-snapshots/` are CI's renderer: a dev machine draws fonts a few pixels differently, so a `bun run test:visual:update` there fails in CI ("Browser checks (site)", `.github/workflows/browser.yml`). When a change moves a page, push it, let the browser job fail on the snapshots alone, download its `playwright-report` artifact, and copy the actual image of each failed snapshot to `e2e/visual-snapshots/<name>.png`: the report's `index.html` embeds a zip of JSON whose `<name>-actual.png` attachments point at `data/<hash>.png`. A conflict on those PNGs when merging `main` is resolved the same way.
