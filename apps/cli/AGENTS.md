# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to `apps/cli` (`@trajectonomics/cli`, the `traj` command line).

## Rules

1. Bun APIs over Node polyfills wherever Bun has one.
2. Keep the CLI deterministic: same input, same output. No hidden state outside what a command documents.
3. Real-world logic lives in `@trajectonomics/core`, imported by subpath: `@trajectonomics/core/ledger`, `@trajectonomics/core/sim`, `@trajectonomics/core/tax` (`packages/core`). Import a core's rules; never copy or reimplement them here. The cores never import each other: they meet only here, in the Baseline mapping (ADR-0004, ADR-0026) and in the tax Levy a Scenario stores, which `sim` charges and `tax` emits (ADR-0032).
4. Commands return exit codes through `run()`; only `src/index.ts` calls `process.exit`.
5. Done means `bun run check` passes in `apps/cli` (Biome lint with zero warnings, strict typecheck, tests, compiled build). Do not loosen `tsconfig.json` or `biome.json` to make an error go away. Vendored skill files (`.agents/`, `.claude/`, `.vibe/` and the root `skills-lock.json`) are excluded from Biome, because the root `bun run skills:update` owns them. A change to the CLI's output also runs `bunx turbo run check --filter=@trajectonomics/cli --filter=@trajectonomics/web`: the web contract tests run the built `traj`, and the CLI's own check no longer waits for the web check.
6. A change a user sees (a command, flag, error code, hint or default) reaches the Docs Portal after its release, not in its own pull request: the `Docs release` workflow opens an issue listing the commits and ADRs between the two release tags. Write the commit subject so that list says what changed for the user.
7. Help examples are part of the CLI contract: `src/help-examples.test.ts` runs every `examples` entry of every command, in order, and an example passes only when it exits as its description documents (ADR-0043). Give an example that needs state a declared setup in `src/help-examples-setup.ts`; never skip it, and fix an example that cannot run as printed rather than the test.
8. A test never calls `mkdtemp` or `mkdtempSync` itself: it calls `makeTempDir` from `src/temp-dir.ts`, and the `bunfig.toml` preload removes every directory it made after the run, pass or fail. `src/temp-dir.test.ts` fails on any other caller, because the shared `/tmp` tmpfs filled with `traj-*` directories (#224).
