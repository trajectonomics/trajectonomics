# AGENTS.md

Read the root [AGENTS.md](../../../AGENTS.md) first. This file holds only what is specific to `packages/core/money` (`@trajectonomics/money`). It is a private workspace package: it is not published, and reaches users only inside the `traj` CLI, which bundles it through `packages/core`.

## Rules

1. Pure package: no network, DOM, framework imports, or locale logic. It ships no currency table and never calls `Intl`, because its callers own currency policy and one of them must stay locale-free. `tsconfig.json` compiles `src` with no DOM, Node, or Bun types, so `fetch`/`process`/`document` fail typecheck; do not add `types` or `lib` entries to get around it.
2. Done means `bun run check` passes in `packages/core/money`: Biome lint with zero warnings, strict typecheck, tests with **100.00% line coverage**, a clean `tsdown` build, `publint --strict` and `attw --profile node16`. Do not loosen `tsconfig.base.json` or `biome.json` to make an error go away.
3. Postponed work is tracked by the issue tracker, not by prose: file an issue, then leave `TODO(#<issue>)` at the code site it belongs to.
4. Keep the surface bounded: only the two conversions, the validation they need, and `MoneyValidationError` are exported. Rounding, percentages, statutory caps and currency-tagged money types belong to the consuming packages, and a new export needs a second consumer.
