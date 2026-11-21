# AGENTS.md

Read the root [AGENTS.md](../../../AGENTS.md) first. This file holds only what is specific to `packages/core/tax` (`@trajectonomics/tax`). It is a private workspace package: it is not published, and reaches users only inside the `traj` CLI, which bundles it through `packages/core`.

## Rules

1. Pure package: no network, DOM, framework imports, or locale/timezone logic. The tax year is a constant per system, never derived from `Date`. `tsconfig.json` compiles `src` with no DOM, Node, or Bun types, so `fetch`/`process`/`document` fail typecheck; do not add `types` or `lib` entries to get around it.
2. Done means `bun run check` passes in `packages/core/tax`:
   - Biome lint with zero warnings.
   - File length limits: max 100 lines per source file, max 200 lines per test file (enforced by Biome).
   - Cognitive complexity: max 10 per function (enforced by Biome).
   - Strict isolatedDeclarations typecheck (`tsc -p tsconfig.json && tsc -p tsconfig.test.json`).
   - Test suite with **100.00% line coverage** threshold (`scripts/check-coverage.ts`).
   - Zero hardcoded strings or diagnostic literals: stages must consume typed field enums and parameters, never raw diagnostic string literals or raw currency strings (`scripts/check-no-hardcoded-strings.ts`).
   - Clean package build (`tsdown`), strict packaging (`publint --strict`), and node16 type checks (`attw`).
   - Run `bun run format` to auto-fix formatting and imports. Do not loosen `tsconfig.base.json` or `biome.json` to make an error go away.

## Statutory Architecture Standards

When implementing statutory rules (e.g. Thailand PIT, US Federal):
1. **Parameters as data**: Statutory amounts, rates, allowances, and brackets live in `parameters.ts` per tax year as typed constants (e.g. `TH_2026_PARAMETERS`). Never inline hardcoded numbers into logic functions.
2. **One rule per file**: Keep statutory deduction, allowance, and expense calculations as pure functions in dedicated files under 100 lines, returning `{ value, breakdown }`.
3. **Staged pipeline**: Wire calculations into an ordered statutory stage pipeline: `assessable` -> `expenses` -> `allowances` -> `brackets` -> `credits` -> `result`. Avoid complex dynamic DAG solvers.
4. **Typed field enums & no raw strings**: Diagnostic field paths and breakdown keys (`ThAssessableField`, `ThExpenseField`, `ThAllowanceField`, `ThBracketField`, `ThTaxField`) and currency codes (`parameters.currency`) must be typed enums/constants. Never pass raw string literals (`"expense.*"`, `"THB"`, etc.) in stages. Enforced statically by `scripts/check-no-hardcoded-strings.ts`.
5. **1:1 Stage-to-test mapping**: Never combine multiple stages or categories into a single merged test file. Each calculation stage file in `src/<jurisdiction>/stages/` must have a dedicated 1:1 unit test file in `src/<jurisdiction>/tests/` under 200 lines.
6. **Minor-unit safety & currency threading**: Caps and percentage calculations (`clampCap`, `resolveCap`) must thread the target `currency` or convert safely using integer minor units (`toMinorUnits` / `fromMinorUnits`). Never execute raw integer checks on major units that can have decimals (e.g. fractional satang/cents).
7. **Chronological order independence**: Any multi-item rule dependent on dates or birth years (e.g. child bonus born >= 2018) must sort entries chronologically before index-based evaluations, independent of input array ordering.
8. **Strict input bounds & safe integers**: Validate monetary amounts, rates, and count fields (children, parents, disabled persons). Counts must be non-negative safe integers; sub-counts (e.g. 2nd+ child bonus) must be validated or clamped against total counts (`Math.min(bonus, Math.max(0, count - 1))`).
9. **Documentation (TSDoc)**: Every exported function, type, and rule must carry a concise TSDoc comment detailing **Purpose**, **Math**, **Units** (major vs integer minor units), **Throws**, and statutory citation (`@statute`).
10. **Statutory reference cross-validation**: All statutory calculators must be cross-validated against official reference sources or government-recognized filing calculators (e.g. Raidaai for Thai PIT ภ.ง.ด. 90/91) across regular, edge, and combined test cases before submitting.
