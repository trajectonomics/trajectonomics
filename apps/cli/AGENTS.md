# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to `apps/cli` (`@trajectonomics/cli`, the `traj` command line).

## Rules

1. Bun APIs over Node polyfills wherever Bun has one.
2. Keep the CLI deterministic: same input, same output. No hidden state outside what a command documents.
3. Real-world logic lives in `@trajectonomics/core`, imported by subpath: `@trajectonomics/core/ledger`, `@trajectonomics/core/sim`, `@trajectonomics/core/tax` (`packages/core`). Import a core's rules; never copy or reimplement them here. The cores never import each other: they meet only here, in the Baseline mapping (ADR-0004, ADR-0026) and in the tax Levy a Scenario stores, which `sim` charges and `tax` emits (ADR-0032).
4. Commands return exit codes through `run()`; only `src/index.ts` calls `process.exit`.
5. Done means `bun run check` passes in `apps/cli` (Biome lint with zero warnings, strict typecheck, tests, compiled build). Do not loosen `tsconfig.json` or `biome.json` to make an error go away. Vendored skill files (`.agents/`, `.claude/`, `.vibe/` and the root `skills-lock.json`) are excluded from Biome, because the root `bun run skills:update` owns them.
