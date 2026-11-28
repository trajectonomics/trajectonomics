# A cash-flow breakdown per Reporting year and per Reporting month

Status: accepted

[ADR 0018](./0018-cash-flow-breakdown.md) reports one Cash-flow breakdown per Annual roll-up, and an Annual
roll-up runs from an anniversary of the As-of (`Timeline.start`), so a plan that starts on 28 November has
years from 28 November to 27 November. A person in Thailand reads money by the calendar year, because the
Thai tax year is the calendar year, and reads a year by its months. The Dashboard may compute nothing (web
ADR 0002) and the CLI may not rebuild the routing (cli AGENTS rule 3), so the engine states both: a breakdown
per **Reporting year**, a year that begins on the 1st of a month the caller chooses, and a breakdown per
**Reporting month**, a calendar month. This ADR adds both under the option pattern of ADR 0017 and ADR 0018.

## Decision

### The option

`ProjectionOptions` (`src/types/statement.ts`) gains `reporting?: ReportingOptions`, defined in a new
`src/types/reporting.ts` (`src/types/breakdown.ts` is already at the file limit):

```ts fragment
export interface ReportingOptions {
	/** The month, 1 (January) to 12 (December), on whose 1st each Reporting year begins. */
	readonly yearStart: number
	/** States `Projection.cashflowYears`, one breakdown per Reporting year. */
	readonly years?: boolean
	/**
	 * States `Projection.cashflowMonths`: the Reporting months of one Reporting year, named by the calendar
	 * year it begins in; `"first"` is the Reporting year that holds `Timeline.start`, `"all"` is every one.
	 */
	readonly monthsOf?: number | "first" | "all"
}
```

- **Opt-in, byte-identical without it.** Without `reporting`, or with `years` not `true` and `monthsOf`
  absent (`reporting: { yearStart: 4 }` is valid and asks for nothing), the Projection has no new key, no observation date is added and the run records no lines, so every
  existing Projection and every parity hash is unchanged.
- **Independent of `cashflowBreakdown`.** The engine records each date's lines when
  `cashflowBreakdown === true` or when `reporting` asks for years or months (one flag into `runEngine`).
  `Projection.cashflow` (the Annual roll-up breakdown) is still stated only with `cashflowBreakdown`. A
  run may ask for any combination, and recording lines changes no other figure (ADR 0018).
- **No new observation date.** A breakdown is a sum of lines, not a snapshot, so Reporting year and month
  ends are never added to `observationDates`. The engine's run, and so every balance, is the run it was.
- **Errors as data.** `src/check/reporting.ts` holds
  `checkReportingOptions(reporting: unknown, timeline: unknown): readonly Problem[]`, called with
  `options.reporting`. `project` returns
  `[...check(baseline, declared, timeline), ...checkReportingOptions(options.reporting, timeline)]` when that
  list is not empty, and `projectPath` appends it after `checkPathSelection(selection)` the same way, so a
  caller gets every problem of one call at once, `check()`'s first. Every problem is
  `{ code: "INVALID_OPTION", path }` (no new code joins `ERROR_CODES`). Absent means `undefined`: a key that
  is missing and a key whose value is `undefined` are both absent, so `{ yearStart: 1, years: true }` is
  valid. The rules, each problem emitted in this order:
  - `reporting` absent: `[]`, nothing else is read.
  - `["options", "reporting"]` when `reporting` is not a plain object (`isRecord`); nothing else is read.
  - `["options", "reporting", "yearStart"]` unless it is an integer from 1 to 12 (`yearStart` is required:
    absent is this problem too).
  - `["options", "reporting", "years"]` when not absent and not a boolean.
  - `["options", "reporting", "monthsOf"]` when not absent and not `"first"`, `"all"` or an integer
    (`Number.isInteger`). When it is an integer `Y`, and only when `reportingYearRange(timeline, yearStart)`
    is defined, also when `Y < first` or `Y > last`. The range uses the horizon, not a run-out date, so a
    caller can know it before the run. A year that begins after the run runs out is valid and states
    `cashflowMonths: []`.
  - `["options", "reporting", key]` for every other own key, in `Object.keys` order, so a misspelt
    `monthOf` is refused rather than ignored.
- **The range is checked only on inputs it can be read from.** `reportingYearRange(timeline: unknown,
  yearStart: unknown): ReportingYearRange | undefined` (in `src/check/reporting.ts`, exported from
  `src/index.ts`) returns `{ first: reportingYearOf(start, yearStart), last: reportingYearOf(horizon,
  yearStart) }` only when `timeline` is a plain object whose `start` and `horizon` pass `isValidDate`
  (`check/date.ts`), `horizon ≥ start`, and `yearStart` is an integer from 1 to 12; otherwise `undefined`.
  So an invalid Timeline or year start never reaches `reportingYearOf`: `check()` reports the date
  (`INVALID_DATE`, `HORIZON_BEFORE_START`) and the reporting check adds no range problem on top of it.
  `ReportingYearRange` is `{ readonly first: number; readonly last: number }`.

### The calendar rule

A pure module, `src/calendar/reporting.ts`, decides every boundary. It imports only `calendar/` (`civil`,
`arith`, `statement-months`) and the type `ReportingSpan` from `src/types/reporting.ts`, and has no clock.
`reportingYearOf` is exported from the package only through `reportingYearRange` (above), so the CLI names
the valid range without copying the rule.

`statementMonths` and `StatementMonth` move from `src/output/statement-months.ts` to
`src/calendar/statement-months.ts`, unchanged, with their test (`src/output/statement-months.test.ts` to
`src/calendar/statement-months.test.ts`). The three importers change only their import path:
`src/engine/project.ts` and `src/output/liabilities.ts` (`statementMonths`) and `src/output/liability-moves.ts`
(the type `StatementMonth`). No other file imports it.

```ts fragment
import type { DateString } from "../types"
import type { ReportingSpan } from "../types/reporting"

/** The Reporting year that holds `date`: the calendar year whose `yearStart` month began it. */
export function reportingYearOf(date: DateString, yearStart: number): number
/** The Reporting years of `[start, end]`, cut at both ends. */
export function reportingYears(
	start: DateString,
	end: DateString,
	runsOut: DateString | undefined,
	yearStart: number,
): readonly ReportingSpan[]
/** The Reporting months of `[start, end]`, cut at both ends, each with its Reporting year. */
export function reportingMonths(
	start: DateString,
	end: DateString,
	runsOut: DateString | undefined,
	yearStart: number,
): readonly ReportingSpan[]
```

```ts fragment
// src/types/reporting.ts
export interface ReportingSpan {
	readonly year: number
	readonly from: DateString
	readonly to: DateString
	readonly partial: boolean
}
```

Every caller passes valid dates with `start ≤ end` and a `yearStart` from 1 to 12: `project` and
`projectPath` run the engine only after both checks pass, and `reportingYearRange` guards its own call.

- **Reporting year `Y`** (with year start `M`) is the nominal span from `Y-M-01` to the day before
  `(Y+1)-M-01`. For `M = 1` that is `Y-01-01` to `Y-12-31`. Both ends are anchored on the 1st, so no date is
  ever clamped, and a year that starts in March ends on 28 or 29 February as the calendar has it.
- **`reportingYearOf(date, M)`** is `date.year` when `date.month ≥ M`, else `date.year − 1`.
- **The first span** is the one that holds `start`; its `from` is `start`. The spans after it begin on their
  nominal first day. **The last span** ends on `end`, which is `runsOut.date` when the run runs out and the
  horizon otherwise (the same `end` `buildPeriods` takes). No span begins after `end`.
- **Partial** is the rule a Statement month already follows (`statementMonths`): a span is partial when
  `from` is not its nominal first day, when `to` is not its nominal last day, or when `to` is the run-out
  date. So:
  - an As-of on the 1st of the year-start month starts a full first year; an As-of on any other day, in any
    month, starts a partial one. A year start equal to the As-of month is not special: As-of 2026-11-28
    with `M = 11` gives a first year from 2026-11-28 to 2027-10-31, partial.
  - an As-of on the 1st of a month starts a full first month; mid-month it starts a partial one.
  - a horizon on a nominal last day ends a full span (unless the run ran out on it); a mid-month horizon
    ends a partial month and a partial year.
  - a horizon less than a month after the As-of gives exactly one month and one year, both partial, over
    the same days; a horizon equal to the As-of gives one one-day month and year, both partial.
  - a run that runs out ends its month and its year on the run-out date, both partial, even when that date
    is a nominal last day, as an Annual roll-up is.
- **Reporting months** cover exactly the days of the Statement months of `[start, end]`;
  `reportingMonths` is `statementMonths(start, end, runsOut)` with `year: reportingYearOf(from, M)` added,
  so the two never disagree. Every span is stated, a span with no line included: its lists are empty and
  its `unmet` is 0.
- `monthsOf: Y` keeps the months whose `year` is `Y`, `"first"` keeps the months of
  `reportingYearOf(start, M)`, and `"all"` keeps every month.

### The output

`Projection` gains two keys, placed right after `cashflow` and present only when asked:

```ts fragment
/** One per Reporting year in order; present only with `reporting.years`. */
readonly cashflowYears?: readonly ReportingCashflow[]
/** The Reporting months `reporting.monthsOf` names, in order; present only with it. */
readonly cashflowMonths?: readonly ReportingCashflow[]
```

```ts fragment
/** Every line list of a Cash-flow breakdown, with no span (ADR 0018, 0027, 0031). */
export interface CashflowLines { income, prepaid, settlements, expenses, categories, contributions,
	employer?, payouts?, withdrawals, transfers?, drawn, surplus, unmet }
/** A Cash-flow breakdown over one Reporting year or month. */
export interface ReportingCashflow extends CashflowLines {
	readonly year: number
	readonly from: DateString
	readonly to: DateString
	readonly partial: boolean
}
```

- `CashflowBreakdown` becomes `{ index, from, to } & CashflowLines`. Its JSON key order is unchanged:
  `breakdownOf` spreads the lines after `index`, `from` and `to`, as it writes them now. A
  `ReportingCashflow` writes `year`, `from`, `to`, `partial`, then the lines in the same order.
- **Every list follows ADR 0018** and its amendments: the same groups, the same order, a line whose amount
  is zero over the span left out, `employer`, `payouts` and `transfers` present by the same Scenario test.
  `unmet` is the run-out Shortfall in the span whose `to` is the run-out date, and 0 elsewhere.
- **No balances.** A breakdown states flows, not balances: no opening, closing or change in cash, because
  the routing spends every unit of cash on each date (ADR 0018), so such a line would carry nothing the
  rows do not. A balance on a date is read from the rows (`resolution: "month"` reports month-end rows).
  There is no roll-up field for a Reporting span, and none is added: the lines are the whole statement.
- **The identity holds per span, exactly in minor units**, as ADR 0018 states it with its amendments:
  `Σincome + Σpayouts + Σwithdrawals + Σdrawn + unmet = Σprepaid + Σsettlements + Σexpenses +
  Σcontributions.applied + Σsurplus`, `Σcategories = Σexpenses`, and `employer` and `transfers` outside
  it. It holds because each span sums whole days and each day balances.
- **Overflow.** A span whose sum leaves the safe integers is refused as `VALUE_OVERFLOW` on the span's
  `to`, as `buildCashflow` refuses a roll-up (the same check, shared).

### The module split

Every file stays within 100 lines and every function within cognitive complexity 10. No new identifier,
file or test name uses _Period_ (a glossary _Avoid_ term; the existing `Period` in `output/periods.ts` is
left as it is).

| File | Holds |
|---|---|
| `src/types/reporting.ts` (new) | `ReportingOptions`, `ReportingSpan`, `ReportingYearRange`, `CashflowLines`, `ReportingCashflow` |
| `src/types/breakdown.ts` | `CashflowBreakdown` becomes `{ index, from, to } & CashflowLines` (the line types stay here; `reporting.ts` imports them) |
| `src/types/statement.ts` | `ProjectionOptions.reporting?: ReportingOptions` |
| `src/types/projection.ts` | `Projection.cashflowYears?` and `Projection.cashflowMonths?`, right after `cashflow` |
| `src/types/index.ts` | `export type * from "./reporting"` |
| `src/index.ts` | `export { reportingYearRange } from "./check/reporting"` |
| `src/calendar/statement-months.ts` (moved) | `statementMonths`, `StatementMonth`, unchanged, with its test |
| `src/calendar/reporting.ts` (new) | `reportingYearOf`, `reportingYears`, `reportingMonths` (pure) |
| `src/check/reporting.ts` (new) | `checkReportingOptions`, `reportingYearRange` |
| `src/engine/project.ts`, `src/engine/project-path.ts` | append `checkReportingOptions(options.reporting, timeline)` to the problems; `projectChecked` records lines when `cashflowBreakdown === true` or `reportingAsked(options.reporting)` is defined, and passes both to `buildProjection` |
| `src/output/cashflow-lines.ts` (exists) | gains `linesOf(scenario: Scenario, sums: PeriodSums, categories: readonly CategoryTotal[], unmet: bigint): CashflowLines`; `breakdownOf` returns `{ index, from, to, ...linesOf(...) }` |
| `src/output/span-sums.ts` (new) | `sumSpans(totals: readonly DayTotals[], spans: readonly { readonly from: DateString; readonly to: DateString }[]): PeriodSums[]`: one pass over the day totals (in date order) with a span cursor, so `"all"` over a 60-year horizon walks the days once, not once per month |
| `src/output/cashflow-reporting.ts` (new) | `reportingAsked(reporting: ReportingOptions \| undefined): ReportingOptions \| undefined` (the options when `years === true` or `monthsOf !== undefined`, else `undefined`); `buildReportingCashflow(run: EngineRun, scenario: Scenario, start: DateString, end: DateString, reporting: ReportingOptions \| undefined): ReportingOutcome`, where `ReportingOutcome` is `{ fields: { cashflowYears?, cashflowMonths? }; problem: ProjectionProblem \| undefined }`: the spans (`runsOut` is `run.runsOut?.date`), their sums, the overflow check and the two keys; `{ fields: {}, problem: undefined }` when `reportingAsked` is `undefined` |
| `src/output/build.ts` | `buildProjection` gains a last parameter `reporting: ReportingOptions \| undefined = undefined`; `buildReports` calls `buildReportingCashflow(run, scenario, timeline.start, end, reporting)` with the `end` `buildProjection` already computes, takes its problem after the breakdown's, and spreads `{ ...cashflow.fields, ...reporting.fields, ...routing.fields }`, which puts the two keys right after `cashflow` |
| `src/golden/reporting-parity-cases.ts` (new) | `REPORTING_PARITY_CASES` (cases C and D), appended last to `EVERY_PARITY_CASE` |

`sumPeriod` and `buildCashflow` keep their behaviour; the overflow test over a span's values moves into one
helper both call.

## Test plan

Every expected figure below is worked by hand from the Flows, not by re-running a sum. Each fixture is a
`makeFixture` setup (THB, rate 0, inflation 0, no Calendar). "cash" is the only Account, asset, rate 0,
both `surplus: [{ account: "cash" }]` and `withdraw: ["cash"]` unless stated. Amounts are minor units.
Lists not named are empty; `unmet` is 0 unless named.

**A. Partial first and last spans, a mid-month horizon** (`reporting-partial-ends`). Cash 0. `pay` income
1000 monthly from 2026-11-30 (lands 2026-11-30, 2026-12-30, 2027-01-30; 2027-02-28 is past the horizon).
`rent` expense 600 monthly from 2026-12-01 (lands 2026-12-01, 2027-01-01, 2027-02-01). Timeline
2026-11-15 to 2027-02-10. Each rent day draws 600 from cash; each pay day fills 1000 into cash.

| span | from | to | partial | income pay | expenses rent | drawn cash | surplus cash |
|---|---|---|---|---|---|---|---|
| month 2026-11 (year 2026) | 2026-11-15 | 2026-11-30 | yes | 1000 | – | – | 1000 |
| month 2026-12 (year 2026) | 2026-12-01 | 2026-12-31 | no | 1000 | 600 | 600 | 1000 |
| month 2027-01 (year 2027) | 2027-01-01 | 2027-01-31 | no | 1000 | 600 | 600 | 1000 |
| month 2027-02 (year 2027) | 2027-02-01 | 2027-02-10 | yes | – | 600 | 600 | – |
| year 2026 (`M = 1`) | 2026-11-15 | 2026-12-31 | yes | 2000 | 600 | 600 | 2000 |
| year 2027 (`M = 1`) | 2027-01-01 | 2027-02-10 | yes | 1000 | 1200 | 1200 | 1000 |
| year 2026 (`M = 11`) | 2026-11-15 | 2027-02-10 | yes | 3000 | 1800 | 1800 | 3000 |

`monthsOf: "first"` gives the two 2026 months, `monthsOf: 2027` the two 2027 months, `"all"` all four.
With `cashflowBreakdown` too, `cashflow` is the one Annual roll-up 2026-11-15 to 2027-02-10 with the `M = 11`
figures, byte for byte the `cashflow` of the same run without `reporting`.

**B. A run-out month** (`reporting-run-out`). Cash 1000. `rent` expense 400 monthly from 2026-01-10; `pay`
income 100 once on 2026-03-05. Timeline 2026-01-01 to 2027-06-30. Hand: 10 Jan draws 400 (cash 600), 10 Feb
draws 400 (200), 5 Mar fills 100 (300), 10 Mar needs 400, draws 300 and leaves 100 unmet: the run ends
2026-03-10.

| span | from | to | partial | income | rent | drawn | surplus | unmet |
|---|---|---|---|---|---|---|---|---|
| month 2026-01 | 2026-01-01 | 2026-01-31 | no | – | 400 | 400 | – | 0 |
| month 2026-02 | 2026-02-01 | 2026-02-28 | no | – | 400 | 400 | – | 0 |
| month 2026-03 | 2026-03-01 | 2026-03-10 | yes | 100 | 400 | 300 | 100 | 100 |
| year 2026 (`M = 1`) | 2026-01-01 | 2026-03-10 | yes | 100 | 1200 | 1100 | 100 | 100 |

Identity in March: 100 + 300 + 100 = 500 = 400 + 100. `cashflowYears` has one entry. `monthsOf: 2027`
is valid (2027 is inside the horizon) and gives `cashflowMonths: []`. `monthsOf: 2028` is `INVALID_OPTION`
at `["options", "reporting", "monthsOf"]`.

**C. A Levy settlement month, and a year start of April** (`reporting-levy-april`). Cash 0. One Levy
`plain`: period `{ month: 1, day: 1 }`, settlement `{ month: 3, day: 31 }`, one Measure `owed` const 9000,
`due: "owed"`, carry-in `{ periodStart: "2025-01-01", tallies: [], prepaid: 7000 }`. `salary` income 10000
monthly from 2026-01-31, label `salary`, Prepayment 1000 bps to `plain` (1000 prepaid, 9000 lands, each
time). Timeline 2026-01-01 to 2027-04-30. Hand: the 2025 period owes 9000 less 7000 prepaid, so 2026-03-31
settles +2000; the 2026 period prepaid 12 × 1000 = 12000 and owes 9000, so 2027-03-31 settles −3000 (a
refund). Each day's net fills cash: 9000 on a plain salary day, 9000 − 2000 = 7000 on 2026-03-31,
9000 + 3000 = 12000 on 2027-03-31.

| span | from | to | partial | income salary | prepaid plain | settlements plain | surplus cash |
|---|---|---|---|---|---|---|---|
| month 2026-03 | 2026-03-01 | 2026-03-31 | no | 10000 | 1000 | 2000 | 7000 |
| month 2027-03 | 2027-03-01 | 2027-03-31 | no | 10000 | 1000 | −3000 | 12000 |
| month 2027-04 | 2027-04-01 | 2027-04-30 | no | 10000 | 1000 | – | 9000 |
| year 2026 (`M = 1`) | 2026-01-01 | 2026-12-31 | no | 120000 | 12000 | 2000 | 106000 |
| year 2027 (`M = 1`) | 2027-01-01 | 2027-04-30 | yes | 40000 | 4000 | −3000 | 39000 |
| year 2025 (`M = 4`) | 2026-01-01 | 2026-03-31 | yes | 30000 | 3000 | 2000 | 25000 |
| year 2026 (`M = 4`) | 2026-04-01 | 2027-03-31 | no | 120000 | 12000 | −3000 | 111000 |
| year 2027 (`M = 4`) | 2027-04-01 | 2027-04-30 | yes | 10000 | 1000 | – | 9000 |

Identities: March 2027, 10000 = 1000 − 3000 + 12000; year 2026 (`M = 4`), 120000 = 12000 − 3000 + 111000.
The last month is full while its year is partial. `monthsOf: "first"` with `M = 4` gives the three months of
2026-01 to 2026-03 (year 2025). With `M = 1` and an As-of on 1 January, the Reporting years cover the same
days as the Annual roll-ups, and their lines equal `cashflow`'s.

**D. The leap day** (`reporting-leap-day`). Cash 0. `pay` income 100 once on 2028-02-29; `rent` expense 30
monthly from 2028-02-29 (lands 2028-02-29, 2028-03-29; 2028-04-29 is past the horizon). Timeline
2028-02-29 to 2028-04-15. Hand: 29 Feb nets 100 − 30 = +70 into cash; 29 Mar draws 30 (cash 40).

| span | from | to | partial | income | rent | drawn | surplus |
|---|---|---|---|---|---|---|---|
| month 2028-02 | 2028-02-29 | 2028-02-29 | yes | 100 | 30 | – | 70 |
| month 2028-03 | 2028-03-01 | 2028-03-31 | no | – | 30 | 30 | – |
| month 2028-04 | 2028-04-01 | 2028-04-15 | yes | – | – | – | – |
| year 2028 (`M = 1`) | 2028-02-29 | 2028-04-15 | yes | 100 | 60 | 30 | 70 |
| year 2027 (`M = 3`) | 2028-02-29 | 2028-02-29 | yes | 100 | 30 | – | 70 |
| year 2028 (`M = 3`) | 2028-03-01 | 2028-04-15 | yes | – | 30 | 30 | – |

April is stated with every list empty. With `M = 3` the year 2027 ends on its nominal last day, 2028-02-29,
and is partial only because it starts on the As-of; its month 2028-02 has `year: 2027`, and
`monthsOf: "first"` gives that one month.

**E. A horizon under a month** (`reporting-short`). Cash 0. `pay` income 50 once on 2026-03-15. Timeline
2026-03-10 to 2026-03-20. One month 2026-03 (2026-03-10 to 2026-03-20, partial) and one year 2026 (`M = 1`,
the same days, partial), each income 50 and surplus 50. With `M = 4` the one year is 2025. With the
Timeline 2026-03-10 to 2026-03-10 there is one one-day month and one one-day year, both partial, empty.

**Calendar unit tests** (`src/calendar/reporting.test.ts`). `reportingYearOf`: (2026-11-15, 1) → 2026;
(2026-02-10, 4) → 2025; (2026-04-01, 4) → 2026; (2028-02-29, 3) → 2027; (2026-12-31, 12) → 2026;
(2026-11-30, 12) → 2025. `reportingYears`:
- (2026-11-01, 2028-03-15, none, 11) → 2026 from 2026-11-01 to 2027-10-31 full; 2027 from 2027-11-01 to
  2028-03-15 partial.
- (2026-11-28, 2027-12-31, none, 1) → 2026 from 2026-11-28 to 2026-12-31 partial; 2027 full.
- (2026-01-01, 2026-12-31, none, 1) → one full year 2026, and no empty year after it.
- (2026-01-01, 2026-12-31, runs out 2026-12-31, 1) → one year 2026, partial.
- (2026-01-01, 2026-01-01, none, 1) → one year 2026 from 2026-01-01 to 2026-01-01, partial.

**Checks on every parity fixture** (`src/golden/reporting-parity.test.ts`, one `it.each` over
`EVERY_PARITY_CASE` from `src/golden/every-parity-case.ts`, as `cashflow-parity.test.ts` does). For each case,
`base` is its `projectOptions` without `cashflowBreakdown` and `reporting`; the plain run is `base` with
`cashflowBreakdown: true`, and the reporting run adds `reporting: { yearStart: 1, years: true, monthsOf: "all" }`,
then again with `yearStart: 7`. Every case runs through `project`. A case with `path` also runs through
`projectPath` with the selection `parity.test.ts`'s `expectPath` builds (`planReturnModel(scenario, path)`, then
`{ model, seed, paths, index }`), and the same checks apply to that run. No case in the list is refused today;
a run that returns `ok: false` fails the test with "the parity fixture must project", as
`cashflow-parity.test.ts` does, and is never skipped. The checks:
- every other key of the Projection is byte-identical to the run without `reporting`;
- the identity and `Σcategories = Σexpenses` hold for every Reporting year and month;
- the months are contiguous, the first `from` is `start`, the last `to` is the run's end, and each month
  lies inside the year its `year` names;
- per line group and id, the sum over the months, the sum over the Reporting years and the sum over the
  Annual roll-ups are equal: three partitions of the same days must agree, which is not the formula
  re-applied.

**Options checks** (`src/check/reporting.test.ts`). `reporting: 5`; `yearStart` 0, 13, 1.5, `"1"` and absent;
`years: "yes"`; `monthsOf` 2025 for case A (before 2026), `"last"` and 2026.5; an unknown key `monthOf` are each
`INVALID_OPTION` at the paths above, from `project` and from `projectPath`, and neither throws. These are
accepted: `{ yearStart: 1, years: true }`, `{ yearStart: 1, years: true, monthsOf: undefined }`,
`{ yearStart: 4 }` (and its Projection equals the run without `reporting`). Order: a Timeline whose horizon is
before its start, with `monthsOf: 2030`, gives exactly `HORIZON_BEFORE_START` and no `monthsOf` problem; a
`yearStart` of 13 with `monthsOf: 2030` gives only the `yearStart` problem; `{ yearStart: 0, years: "x" }` gives
both, `yearStart` first. `reportingYearRange` returns `undefined` for an invalid date, a horizon before the
start and a `yearStart` of 0, and `{ first: 2026, last: 2027 }` for case A with `yearStart` 1.

## Considered options

- **Move the Annual roll-up to a chosen year start.** Rejected: `annual`, the Levy reports, the Spending rule
  years and every parity hash read the anniversary periods, and the chance-of-success Bands are per roll-up.
  A Reporting year is a second view of the same lines, and changes nothing that exists.
- **State roll-up fields (net worth, interest, fees) per Reporting span.** Rejected for now: a field needs a
  snapshot at each span end, which adds observation dates to every run that asks, and the request was the
  cash flow. A balance on a date is already in the rows.
- **An opening and closing cash line.** Rejected as in ADR 0018: the routing holds no cash back, so the line
  would always be zero.
- **Name a month's year by its index.** Rejected: an index moves when the As-of moves. A calendar year number
  is what a person and the Dashboard can name, and it does not depend on the run.
- **Refuse a `monthsOf` year after the run ran out.** Rejected: the run-out date is known only after the run,
  and an empty list states the answer exactly.
- **Sum each span with `sumPeriod`.** Rejected for `"all"`: it walks every day once per month, about 16 million
  steps over a 60-year horizon. One pass is linear in days plus spans.

## Consequences

- Existing parity hashes are unchanged. Two cases join `parity/cases.json`, both with the option:
  `reporting-levy-april` (case C, years and `"all"`) and `reporting-leap-day` (case D, `M = 3`, years and
  `"all"`). They are `REPORTING_PARITY_CASES`, appended last to `EVERY_PARITY_CASE`, so
  `git diff parity/cases.json` shows only those two additions, at the end.
- `bun run bench` without the option is unchanged within noise (the option-off path does no new work).
- `reportingYearRange` is exported, so the CLI names the valid range of years without a rule of its own.
- [ADR 0018](./0018-cash-flow-breakdown.md) is amended: its lines and identity now also hold per Reporting
  year and month.
