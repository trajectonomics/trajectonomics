# AGENTS.md

Read the root [AGENTS.md](../../../AGENTS.md) first. This file holds only what is specific to `packages/core/ledger` (`@trajectonomics/ledger`). It is a private workspace package: it is published only through `@trajectonomics/core/ledger`.

## Rules

1. Pure package: no network, DOM, framework imports, database (no SQLite), CLI, sync metadata, or agent concerns. It is pure and deterministic: data in, data out, no I/O, no clock, no randomness, no ID generation (callers supply IDs). It is closed-world: no callbacks or plugin hooks. If real life does not fit, the fix is a new core primitive, never an extension point. `tsconfig.json` compiles `src` with no DOM, Node, or Bun types, so `fetch`/`process`/`document` fail typecheck; do not add `types` or `lib` entries to get around it.
2. Done means `bun run check` passes in `packages/core/ledger`: Biome lint with zero warnings, strict typecheck, tests, build, publint and are-the-types-wrong. Do not loosen `tsconfig.base.json` or `biome.json` to make an error go away.
3. A PR that adds or narrows a `LedgerErrorCode` is `feat!:` and nothing else (ADR-0005).
4. Postponed work is tracked by the issue tracker, not by prose: file an issue, then leave `TODO(#<issue>)` at the code site it belongs to. Every unactioned `TODO` carries an issue number.
