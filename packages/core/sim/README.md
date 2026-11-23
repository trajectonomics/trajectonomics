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

With `liabilityStatements: true`, a Projection also reports one monthly statement per liability: the
drawn and paid amounts, the interest and the amount owed, and the `paidOff` date once it is zero. See
[ADR 0017](docs/adr/0017-liability-statements.md).

With `cashflowBreakdown: true`, a Projection also reports one cash-flow breakdown per Annual roll-up:
the income by Flow, the Prepayment and Settlement by Levy, the expenses by Flow and category, the
contributions by Account, the withdrawals and surplus, with money in equal to money out exactly. See
[ADR 0018](docs/adr/0018-cash-flow-breakdown.md).

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

const result = project(baseline, scenario, timeline, { liabilityStatements: true })
if (result.ok) {
	const owed = result.projection.rows.find((row) => row.date === "2026-06-30")?.balances.find((item) => item.account === "car-loan")
	console.log(owed?.amount)
	const statement = result.projection.liabilities?.find((item) => item.account === "car-loan")
	for (const month of statement?.months ?? []) console.log(month.to, month.drawn, month.interest, month.paid, month.closing)
	console.log(statement?.paidOff)
}
```

It prints the payment, the empty problem list and the loan's balance at 30 June in minor units:

```text
860665
[]
5023542
2025-12-31 0 0 0 0
2026-01-31 10000000 0 860665 9139335
2026-02-28 0 45697 860665 8324367
2026-03-31 0 41622 860665 7505324
2026-04-30 0 37527 860665 6682186
2026-05-31 0 33411 860665 5854932
2026-06-30 0 29275 860665 5023542
2026-07-31 0 25118 860665 4187995
2026-08-31 0 20940 860665 3348270
2026-09-30 0 16741 860665 2504346
2026-10-31 0 12522 860665 1656203
2026-11-30 0 8281 860665 803819
2026-12-31 0 4019 807838 0
2026-12-31
```

## Spending rules

An expense Flow takes `rule` instead of `amount`, `derive` or `level`: its yearly amount follows what a
portfolio of asset Accounts is worth. The rule reads the portfolio on the Flow's first Landed date and
on each later one that is twelve Occurrences on (one for an annual Flow), before any Flow lands, and fixes that Rule year's amount `Y`. A
monthly Flow pays `floor(Y × k / 12) − floor(Y × (k − 1) / 12)` on its k-th Occurrence of the year, so
twelve add to `Y` exactly; an annual Flow pays `Y` once. The withdraw order, a Shortfall and tax
Settlement are unchanged. A fixed amount that keeps its real value is an ordinary expense with
`growth: "inflation"`. There is no default rate or rounding. See [ADR 0023](docs/adr/0023-spending-rules.md).

`initialRate` fixes the first year from the portfolio and holds that amount level in real terms:

```ts fragment
{ id: "spending", kind: "expense", frequency: "monthly", start: "2026-01-01",
  rule: { kind: "initialRate", portfolio: ["funds"], rateBps: 400, rounding: "halfUp" } }
```

`currentRate` takes a share of each year's portfolio, with optional dated rate `steps` and a `floor`
and `ceiling` that grow like a fixed amount; where growth makes them cross, the ceiling wins:

```ts fragment
{ id: "spending", kind: "expense", frequency: "monthly", start: "2026-01-01",
  rule: { kind: "currentRate", portfolio: ["funds", "rmf"], rateBps: 400, rounding: "halfUp",
    steps: [{ from: "2030-01-01", bps: 450 }],
    floor: { amount: 3_000_000, growth: "inflation" }, ceiling: { amount: 6_000_000, growth: "inflation" } } }
```

`guardrails` carries last year's amount forward with inflation, cuts it by `upper.adjustBps` when the
withdrawal rate has risen `upper.bps` above `rateBps` (relative), and raises it by `lower.adjustBps`
when it has fallen `lower.bps` below. With `lower` alone it only raises, never cuts:

```ts fragment
{ id: "spending", kind: "expense", frequency: "monthly", start: "2026-01-01",
  rule: { kind: "guardrails", portfolio: ["funds"], rateBps: 400, rounding: "halfUp",
    upper: { bps: 2000, adjustBps: 1000 }, lower: { bps: 2000, adjustBps: 1000 } } }
```

With `spendingRules: true`, a Projection reports one statement per rule Flow: for each Rule year its
first date, the `portfolio` read, the `amount` fixed, what was `paid`, the `withdrawalRateBps` and the
`action` (`none`, `floor`, `ceiling`, `cut` or `raise`). A portfolio of 100,000,000 that falls 10% a year
under a 4% guardrails rule is cut in its third year:

```ts
import { project, type SpendingRule } from "@trajectonomics/core/sim"

const rule = {
	kind: "guardrails",
	portfolio: ["funds"],
	rateBps: 400,
	rounding: "halfUp",
	upper: { bps: 2000, adjustBps: 1000 },
	lower: { bps: 2000, adjustBps: 1000 },
} satisfies SpendingRule

const result = project(
	{ schemaVersion: 1, balances: [{ account: "cash", amount: 10_000_000_000 }, { account: "funds", amount: 100_000_000 }] },
	{
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "funds", kind: "asset", rate: -1000 },
		],
		flows: [{ id: "spending", kind: "expense", frequency: "monthly", start: "2026-01-01", rule }],
		cashflow: { contribute: [], surplus: [{ account: "cash" }], withdraw: ["cash"] },
	},
	{ start: "2026-01-01", horizon: "2028-12-31", resolution: "month" },
	{ spendingRules: true },
)

if (result.ok) {
	for (const year of result.projection.spendingRules ?? []) {
		for (const { date, portfolio, amount, withdrawalRateBps, action } of year.years) {
			console.log(date, portfolio, amount, withdrawalRateBps, action)
		}
	}
}
```

The portfolio falls to 90,000,000 and then 81,000,000. In the second year the rate is 4.44%, inside the
band; in the third the amount 4,000,000 is above 4.8% of the portfolio, so the year pays 90% of it:

```text
2026-01-01 100000000 4000000 400 none
2027-01-01 90000000 4000000 444 none
2028-01-01 81000000 3600000 444 cut
```

Financial Independence prices a rule Flow from each candidate's own walk, as it does a Derived amount
that reads an Account. `chanceOfSuccess` runs the rule on every Market path. A `next12Months` Milestone
Metric is refused beside a rule Flow (`NEXT_12_MONTHS_READS_ACCOUNT`) unless that Flow's `startAt`
names the Milestone the Metric sits on, and `retirementSpending`
replaces a rule Flow like any expense.

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

## Contribution savings

`contributionSavings(levy, period, options)` states what raising one contribution label by whole
steps would take off a Settlement period's `due`, under that Levy's own rules. It takes a Settlement
period as `project()` reports it (it checks that the Levy reproduces the period's `due`), rebuilds
the period's Tallies from its `tally` Measure values and scans each label in the order given: a step
is taken while `due` falls by more than 0 (and by at least `minSavingBps` of a step), within the
`budget`. A label stops at the first step not taken, and the next label starts from what the earlier
ones left. When a label stops because a step saved nothing, the last step it took is kept only if
its last `grain` (one major unit, in minor units) still saved something: a step that went past a cap
is dropped, so no suggestion goes over a cap, and one that ends exactly on the cap is kept. This Levy
taxes net income at 10% up to 400,000 and 20% above it, and allows `min(funded, 250,000)` off `fund`:

```ts
import { contributionSavings, type Levy } from "@trajectonomics/core/sim"

const levy = {
	id: "tax",
	period: { month: 1, day: 1 },
	settlement: { month: 3, day: 31 },
	due: "due",
	measures: [
		{ id: "zero", op: "const", value: 0 },
		{ id: "income", op: "tally", label: "salary", basis: "gross" },
		{ id: "funded", op: "tally", label: "fund", basis: "funded" },
		{ id: "cap", op: "const", value: 250_000 },
		{ id: "allowance", op: "min", a: "funded", b: "cap" },
		{ id: "net", op: "sub", a: "income", b: "allowance" },
		{ id: "taxable", op: "pick", a: "net", b: "zero", then: "net", else: "zero" },
		{ id: "bound", op: "const", value: 400_000 },
		{ id: "low", op: "min", a: "taxable", b: "bound" },
		{ id: "high", op: "sub", a: "taxable", b: "low" },
		{ id: "lowTax", op: "scale", of: "low", num: 10, den: 100, rounding: "floor" },
		{ id: "highTax", op: "scale", of: "high", num: 20, den: 100, rounding: "floor" },
		{ id: "due", op: "add", a: "lowTax", b: "highTax" },
	],
} satisfies Levy

const period = {
	to: "2026-12-31",
	due: 160_000,
	measures: [
		{ id: "income", value: 1_000_000 },
		{ id: "funded", value: 0 },
	],
}

console.log(
	JSON.stringify(
		contributionSavings(levy, period, {
			labels: ["fund"],
			step: 100_000,
			grain: 1_000,
			inflation: 0,
			maxSteps: 50,
		}),
	),
)
```

Two steps of 100,000 save 20,000 each. The third (to 300,000) saves 10,000, but only the first
50,000 of it is under the cap: its last 1,000 saves nothing, so it is dropped, and the fourth saves
nothing either:

```text
{"ok":true,"dueBefore":160000,"dueAfter":120000,"labels":[{"label":"fund","plannedFunded":0,"extra":200000,"saving":40000,"stoppedBy":"noSaving"}]}
```

The search is bounded: more than `maxSteps` steps in all returns `TOO_MANY_STEPS` instead of an
answer cut short, and an unread label, a bad option or an overflow come back as
`{ ok: false, problem }`. A step is whole, so a cap that is not a multiple of the step leaves some
of its room unused; a smaller `step` fills more of it. See [ADR 0022](docs/adr/0022-contribution-savings-scan-steps.md).

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
