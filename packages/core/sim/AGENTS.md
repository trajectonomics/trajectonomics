# AGENTS.md

Read the root [AGENTS.md](../../../AGENTS.md) first. This file holds only what is specific to `packages/core/sim` (`@trajectonomics/sim`). It is a private workspace package: it is not published, and reaches users only inside the `traj` CLI, which bundles it through `packages/core`.

## Rules

1. Pure package: no network, DOM, framework imports, or wall-clock logic. The projection as-of date is an input, never derived from `Date.now()`. `tsconfig.json` compiles `src` with no DOM, Node, or Bun types, so `fetch`/`process`/`document` fail typecheck; do not add `types` or `lib` entries to get around it.
2. Done means `bun run check` passes in `packages/core/sim`:
   - Biome lint with zero warnings.
   - File length limits: max 100 lines per source file, max 200 lines per test file (enforced by Biome).
   - Cognitive complexity: max 10 per function (enforced by Biome).
   - Strict isolatedDeclarations typecheck (`tsc -p tsconfig.json && tsc -p tsconfig.test.json`).
   - Clean package build (`tsdown`), strict packaging (`publint --strict`), and node16 type checks (`attw`).
   - Cross-runtime parity: the built package under Node hashes identically to `parity/cases.json` (recorded under Bun). After an intended numeric change run `bun run parity:update`.
   - Run `bun run format` to auto-fix formatting and imports. Do not loosen `tsconfig.base.json` or `biome.json` to make an error go away.
3. Never write a closing keyword (`Closes #<n>`, `Fixes #<n>`, `Resolves #<n>`) in a pull-request body unless merging that pull request is meant to close the issue. GitHub parses the keyword out of prose too, in any sentence, so even a line disclaiming one closes the issue on merge. Name the issue with a bare `#<n>` or a link instead. On 2026-11-21 a docs pull request whose body said `Closes #114 is not claimed here` closed #114 on merge, and it had to be reopened.

## README code blocks

A fenced `ts` block in `README.md` is executed by `src/readme-examples.test.ts`, so it must be a complete module that runs as printed, followed by a `text` block holding exactly its stdout. Fence illustrative data `ts fragment`: it is checked as a value instead of run.

## Core Simulation Principles

1. **Closed-world simulation**: All variation comes from validated data models, never from user callbacks or plugin hooks. If a scenario cannot be represented, add a new core primitive.
2. **Determinism**: Given the same baseline, scenario, and timeline parameters, simulation output must be bit-for-bit identical across runs.
3. **Decoupled domain**: `sim` knows nothing about SQLite, UI, CLI, or agent concerns. Callers translate their external state into core inputs.
4. **Minor-unit safety**: All monetary arithmetic uses integer minor units (e.g. cents, satang).

## Review conventions

The root [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) applies. These are the sim-specific judgement calls for review. The mechanical rules live in `biome.json`, the tsconfigs and `bun run check`.

- **Glossary vocabulary.** Identifiers and test names use the terms in `GLOSSARY.md`. A term listed under `_Avoid_` (Event, Stream, Period, Run, Tick, ...) does not name a type, function or file.
- **Hand-computed expectations.** A test's expected value comes from a hand calculation, the oracle, or a recorded fixture. Re-applying the formula under test to produce the expected value cannot fail, so it is not a test.
- **Independent oracle.** Code under `src/golden/oracle-*` imports nothing from `calendar/`, `money/`, `engine/` or `output/`, and prefers naive arithmetic (exact rationals, day-by-day walks) over mirroring the engine's design.
- **One worked number per identity.** Each stated identity (conservation, rounding, day count) has a test with a concrete number, including the tie, leap-day and shortfall cases.
- **Errors as data.** For input that `check()` accepts, `project()` returns a result and never throws. Calendar arithmetic stays inside the supported years or saturates.
- **Intended numeric change.** A change to any projected number updates the ADR or glossary when the decision changes, runs `bun run parity:update`, and says so in the PR description.
