# sim-core

Pure, deterministic personal-finance projection engine.

## Quickstart

Money is integer minor units and rates are integer basis points. This projects a year of one
income, one expense and a monthly saving into a 3% Account.
The import path is the bundled one, `@trajectonomics/core/sim`:

```ts
import {
	type Baseline,
	check,
	project,
	type Scenario,
	type Timeline,
} from "@trajectonomics/core/sim"

const baseline = {
	schemaVersion: 1,
	balances: [
		{ account: "cash", amount: 5_000_000 },
		{ account: "savings", amount: 0 },
	],
} satisfies Baseline

const scenario = {
	schemaVersion: 4,
	currency: "THB",
	economy: { inflation: 0 },
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		{ id: "savings", kind: "asset", rate: 300 },
	],
	flows: [
		{ id: "salary", kind: "income", earned: true, amount: 6_000_000, frequency: "monthly", start: "2026-01-25", growth: { bps: 0 } },
		{ id: "living", kind: "expense", amount: 2_500_000, frequency: "monthly", start: "2026-01-01", growth: { bps: 0 } },
		{ id: "save", kind: "contribution", target: "savings", amount: 1_000_000, frequency: "monthly", start: "2026-01-25", growth: { bps: 0 } },
	],
	cashflow: { contribute: ["savings"], surplus: [{ account: "cash" }], withdraw: ["cash"] },
} satisfies Scenario

const timeline = {
	start: "2026-01-01",
	horizon: "2026-12-31",
	resolution: "month",
} satisfies Timeline

console.log(check(baseline, scenario, timeline))

const result = project(baseline, scenario, timeline)
if (result.ok) console.log(result.projection.annual[0]?.closingNetWorth)
```

It prints the empty problem list and the year's closing net worth in minor units:

```text
[]
47170237
```

## Overview

`sim-core` models personal-finance projection as it works in the real world:
- **Pure and deterministic**: Given a baseline financial state and an event scenario, it produces a projection timeline. The as-of date is an input; there is no unseeded randomness and no internal wall clock.
- **Closed-world**: No callbacks or external plugin hooks; all behavior emerges from validated, structured data.
- **Strict environment**: Built with strict TypeScript with zero DOM, Node, or Bun ambient types in the core engine.

## Input schema

A Scenario is version `4`. `check()` reports `UNSUPPORTED_SCHEMA_VERSION` at
`scenario.schemaVersion` for anything else, so an older Scenario is rejected before its fields
are read. v3 added nominal compounding; v4 replaced `levy` with `levies` and `prepaymentBps`
with `prepayments`, renamed `Projection.levy` to `Projection.levies`, and added `steps` on a
`const` Measure and `derive` on a Flow. An Account may declare a `compounding` period
(`monthly`, `quarterly`, `semiannual` or `annual`) to make its `rate` nominal; without it,
`rate` is the effective annual rate. See [ADR 0007](docs/adr/0007-nominal-compounding.md).

## Loans

A liability borrows through a `withdrawal` Flow: the amount owed grows and the cash lands, so net
worth is unchanged that day. A `contribution` into a nominal liability can carry a `level` amount
instead of an `amount`: the one payment that repays `principal` over `payments` equal payments at
the Account's nominal rate, rounded once with the stated `rounding`. `levelPayment` returns the same
figure without a Projection. See [ADR 0016](docs/adr/0016-loans-borrowing-and-level-payments.md).

```ts
import {
	type Baseline,
	check,
	levelPayment,
	project,
	type Scenario,
	type Timeline,
} from "@trajectonomics/core/sim"

// A 100,000.00 loan at 6% nominal, compounded monthly, repaid over 12 month ends.
console.log(levelPayment({ principal: 10_000_000, rate: 600, periodsPerYear: 12, payments: 12, rounding: "ceil" }))

const baseline = {
	schemaVersion: 1,
	balances: [
		{ account: "cash", amount: 0 },
		{ account: "car-loan", amount: 0 },
	],
} satisfies Baseline

const scenario = {
	schemaVersion: 4,
	currency: "THB",
	economy: { inflation: 0 },
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		{ id: "car-loan", kind: "liability", rate: 600, compounding: "monthly" },
	],
	flows: [
		{ id: "pay", kind: "income", earned: true, amount: 2_000_000, frequency: "monthly", start: "2026-01-31", growth: { bps: 0 } },
		{ id: "borrow", kind: "withdrawal", source: "car-loan", frequency: "once", start: "2026-01-31", amount: 10_000_000, growth: { bps: 0 } },
		{ id: "repay", kind: "contribution", target: "car-loan", frequency: "monthly", start: "2026-01-31", level: { principal: 10_000_000, payments: 12, rounding: "ceil" } },
	],
	cashflow: { contribute: [], surplus: [{ account: "cash" }], withdraw: ["cash"] },
} satisfies Scenario

const timeline = {
	start: "2025-12-31",
	horizon: "2026-12-31",
	resolution: "month",
} satisfies Timeline

console.log(check(baseline, scenario, timeline))

const result = project(baseline, scenario, timeline)
if (result.ok) {
	const owed = result.projection.rows.find((row) => row.date === "2026-06-30")?.balances.find((item) => item.account === "car-loan")
	console.log(owed?.amount)
}
```

It prints the payment, the empty problem list and the loan's balance at 30 June in minor units:

```text
860665
[]
5023542
```

## Levies

A Levy is a closed rule set: a twelve-month period rule, a settlement rule and a graph of
Measures over the Flows' Tally labels. A Scenario may hold several in `scenario.levies`; each
has its own periods, Settlement and Carry-in, and they share Tally labels but never read each
other. `check()` refuses a Levy whose `due` graph reads Tally labels that no Flow, Account or
Carry-in supplies (`UNSUPPLIED_TALLY_LABEL`), because every total it reads would be zero in every
Settlement period. A Flow's Prepayment credits one Levy per entry, and the shares are rounded cumulatively
in Scenario Levy order so together they never exceed the gross:

```ts fragment
{ id: "salary", kind: "income", earned: true, amount: 1_000_000, frequency: "monthly",
  start: "2026-01-31", growth: { bps: 0 }, label: "salary",
  prepayments: [{ levy: "national", bps: 300 }, { levy: "local", bps: 200 }] }
```

A `const` Measure may step on given dates. A Settlement period reads the last step on or before
its own last day, not its Settlement date, so a fact that holds at the end of a period governs
that period and a step between the two does not reopen it:

```ts fragment
{ id: "due", op: "const", value: 100_000,
  steps: [{ from: "2026-06-01", value: 200_000 }, { from: "2027-01-01", value: 300_000 }] }
```

A Flow takes `derive` instead of `amount` and `growth`: a Measure graph whose `flow` op reads
another Flow's planned gross amount on the same Landed date, before Prepayment and any cap, and
0 when that Flow does not land then. Rent as 30% of salary follows a raise:

```ts fragment
{ id: "rent", kind: "expense", frequency: "monthly", start: "2026-01-31",
  derive: { measures: [
    { id: "salary", op: "flow", flow: "salary" },
    { id: "result", op: "scale", of: "salary", num: 30, den: 100, rounding: "halfUp" },
  ], result: "result" } }
```

A negative derived amount or one that overflows is reported, never clamped. In the Financial
Independence test earned income stops, so a derived amount that reads it falls to 0. That is right
for a derived income and for a derived contribution into an asset, and wrong for a derived expense
and for a derived contribution into a liability, which is a debt payment and would silently stop
being paid. The FI entry rejects both: a derived expense unless `retirementSpending` replaces every
expense after the FI month, and a derived debt payment unconditionally
(`DERIVED_DEBT_PAYMENT_READS_EARNED`), because retirement spending replaces expenses only. The plain
Projection is unaffected. See [ADR 0014](docs/adr/0014-levy-extensions.md).

## Scripts

- `bun run check`: Complete verification suite (`lint`, `typecheck`, `test`, `build`, `parity`, `lint:package`).
- `bun run build`: Build ESM and CJS bundles via `tsdown`.
- `bun test`: Run test suite.
- `bun run typecheck`: Run strict TypeScript compiler checks.
- `bun run lint`: Lint with Biome (zero warnings allowed).
- `bun run format`: Auto-format and organize imports with Biome.
- `bun run lint:package`: Validate package manifests and type exports with `publint` and `@arethetypeswrong/cli`.

## License

MIT

## Releasing

This package is not published. It ships inside the `traj` CLI's binaries through
[`packages/core`](../README.md), so a change here reaches users in the next `cli-vX.Y.Z` release; see
[docs/runbooks/release.md](../../../docs/runbooks/release.md). `package.json` says
`0.0.0-development` on purpose and is never edited by hand.
