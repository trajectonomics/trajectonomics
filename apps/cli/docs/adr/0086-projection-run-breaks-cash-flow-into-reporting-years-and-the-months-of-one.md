# Projection run breaks cash flow into Reporting years and the months of one

Status: accepted. Not yet released.

`projection run --breakdown` (ADR-0058) states the cash flow per Annual roll-up, which runs from an
anniversary of the As-of. A person reads their year from January, or from the month their tax or pay year
begins, and they want to see the months inside it. Sim ADR 0034 adds both to the engine under
`ProjectionOptions.reporting`: `Projection.cashflowYears`, one Cash-flow breakdown per Reporting year that
begins on the 1st of a chosen month, and `Projection.cashflowMonths`, one per Reporting month of the Reporting
years asked for. This ADR carries them to `projection run` and `projection path`, as JSON tables and a human
form. It amends ADR-0058 and leaves `--breakdown` unchanged.

The Dashboard reads the answer in two parts (web ADR-0002: it shows the CLI's strings and never sums money):
its Snapshot carries every Reporting year and the months of the first one, and it asks for the months of
another year on demand, one `traj` read per year, through a loopback route like `POST /what-if`. The hosted
Demo writes the same per-year answers as static files. So one read must return the months of exactly one
Reporting year, named by something the Dashboard already has: the year's number, from `cashflowYears`.

## Decision

### Flags

```text
traj projection run ... [--breakdown] [--breakdown-years] [--breakdown-months <first|all|YYYY>] [--year-start <1-12>]
traj projection path ... (the same four flags)

--breakdown                  unchanged: the cash flow per Annual roll-up (ADR-0058)
--breakdown-years            the cash flow per Reporting year
--breakdown-months first     the months of the first Reporting year
--breakdown-months 2027      the months of Reporting year 2027 (the year that begins in 2027)
--breakdown-months all       the months of every Reporting year
--year-start 4               Reporting years begin on 1 April; default 1 (January), valid only with
                             --breakdown-years or --breakdown-months
```

- They are three new flags in a `reportingFlags` record in `src/projection/flags.ts`, spread into the inputs
  of `projection run` and `projection path` next to `outputFlags`: `breakdownYears` (`z.boolean().default(false)`),
  `breakdownMonths` (`z.string().optional()`) and `yearStart` (`z.number().optional()`, with no `.int()`, so
  `--year-start 1.5` reaches the CLI's own row below rather than a parser error). `--year-start` has no zod
  default, so the CLI can tell a flag given alone; when absent the run uses 1.
- `--breakdown` keeps its boolean. The request asked for `--breakdown=monthly`; the flag parser gives a flag
  exactly one kind, so a valued `--breakdown` would break every existing `--breakdown` call and help example.
- The three flags are independent of `--breakdown`, `--monthly` and every other output flag, and any
  combination is valid. `--monthly` adds monthly rows; it does not change a breakdown.
- The horizon cuts the last Reporting year and month (`--horizon`), and a run-out cuts the year and month
  it falls in, as the engine states them. `projection path` states the breakdown of the one Market path it
  runs. `projection chance`, `compare` and `fi` do not take the flags: they state no breakdown today.
- The CLI translates the flags into `options.reporting` and nothing else, and writes only the keys it sets
  (`exactOptionalPropertyTypes` is on, and the engine refuses no absent key, but a key is never written as
  `undefined`):
  `{ yearStart: yearStart ?? 1, ...(breakdownYears ? { years: true } : {}), ...(monthsOf === undefined ? {} : { monthsOf }) }`,
  where `monthsOf` is `"first"`, `"all"` or the year as a number. Without `--breakdown-years` and
  `--breakdown-months` the function returns `undefined` and `reporting` is left out, so every existing answer
  keeps its bytes.
- **How the options reach the run.** `Wants` (`src/projection/run-tables.ts`) gains
  `reporting: ReportingOptions | undefined`. `run` and `path` (`src/commands/projection/run.ts`, `path.ts`)
  call `reportingOptionsOf(input, placed.timeline)` right after `withCarryInSide` returns `placed`, return its
  failure, and pass `{ ...input, reporting }` as the `Wants` to `projectionOf` or `pathOf`. `optionsOf`
  (`src/projection/liabilities.ts`) gains a fifth parameter `reporting: ReportingOptions | undefined` and adds
  `...(reporting === undefined ? {} : { reporting })`; `projectionOf` and `pathOf` pass `wants.reporting`.
  `extraTablesOf` adds the six tables when `wants.reporting` is defined (below), and `runViewOf` writes
  `yearStart` from `wants.reporting.yearStart`.

### Validation

The CLI checks the flags in a pure function in `src/projection/reporting-input.ts`:

```ts fragment
export type ReportingInput = {
	breakdownYears: boolean
	breakdownMonths?: string | undefined
	yearStart?: number | undefined
}
export function reportingOptionsOf(
	input: ReportingInput,
	timeline: Timeline,
): ReportingOptions | undefined | AppError
```

It runs after `prepare` and `withCarryInSide`, for both `projection run` and `projection path`, and before the
engine. The year range comes from sim's exported `reportingYearRange(timeline, yearStart)`, so the CLI copies
no rule; when it returns `undefined` (an As-of or horizon that is not a real date, or a horizon before the
As-of), the range row is skipped and the engine's own refusal (`INVALID_DATE`, `HORIZON_BEFORE_START`) is
the answer, never a range made of a nonsense date. The engine checks the same options (`INVALID_OPTION`,
which `refusal-elsewhere.ts` already maps to input; the comment above that entry changes from "Refused by
`contributionSavings` only" to name `project` and `projectPath` for `options.reporting` too, cli ADR-0086,
which the CLI's own check refuses first); the CLI's check is there so the message names the flag. Checked in
this order, first failure wins:

| Input | `path` | `message` | `hint` |
|---|---|---|---|
| `--year-start` not an integer from 1 to 12 (`0`, `13`, `1.5`) | `yearStart` | `--year-start: 13 is not a month number. Give 1 (January) to 12 (December).` | `A Reporting year starts on the 1st of this month; 1 makes it the calendar year.` |
| `--year-start` without either breakdown flag | `yearStart` | `--year-start applies only with --breakdown-years or --breakdown-months.` | `Add --breakdown-years for a breakdown per Reporting year, or drop --year-start.` |
| `--breakdown-months` not `first`, `all` or four digits | `breakdownMonths` | `--breakdown-months: "2026-11" is not first, all or a year such as 2027.` | `Name a Reporting year by the calendar year it begins in.` |
| a year outside the Projection | `breakdownMonths` | `--breakdown-months: 2028 is outside this Projection, whose Reporting years run from 2026 to 2027 (--year-start 1).` | `Give a year from 2026 to 2027, or move --horizon.` |

A value the flag parser cannot read as a number (`--year-start x`) keeps the parser's own error. The year range
is `reportingYearRange`'s `first` to `last`: the Reporting year of the As-of to that of the horizon. A year inside that range but after
the money runs out is valid: the engine states no months for it (`cashflowMonths: []`), the tables are empty,
and the human form prints `no months: the money runs out on 2026-03-10, before the Reporting year asked for.`
(the date is the answer's `runsOut` date; the line prints when the `cashflowMonths` table is present and
empty).

### JSON

Each flag adds tables to `tables` (ADR-0027), placed right after the `--breakdown` tables:

| Flag | Tables | Row |
|---|---|---|
| `--breakdown-years` | `cashflowYears` | `{ year, from, to, partial, group, id, account, category, amount, entry? }` |
| | `cashflowYearTotals` | `{ year, from, to, partial, total, amount }` |
| | `cashflowYearTransfers`, only when the engine states a transfer | `{ year, from, to, partial, flow, source, target, amount, unmoved }` |
| `--breakdown-months` | `cashflowMonths` | `{ year, month, from, to, partial, group, id, account, category, amount, entry? }` |
| | `cashflowMonthTotals` | `{ year, month, from, to, partial, total, amount }` |
| | `cashflowMonthTransfers`, only when the engine states a transfer | `{ year, month, from, to, partial, flow, source, target, amount, unmoved }` |

- `year` is the Reporting year's number (a JSON number), `month` is `"YYYY-MM"` (the first seven characters
  of `from`), `from` and `to` are the dates the span covers, and `partial` is the engine's flag. `group`, `id`,
  `account`, `category`, `amount` and `entry` mean what they mean in `cashflow` (ADR-0058, ADR-0070), in the same
  group order (`CASHFLOW_GROUPS`).
- The totals tables state the nine totals of `CASHFLOW_TOTALS` for every span, in order, a zero as `0.00`,
  including a span with no lines, so a reader can draw a month with nothing in it.
- The answer gains a top-level `yearStart` (a number) in `projectionRunFields`, present only with either
  flag, so a reader can name the year rule without reading the command.
- The views are zod schemas, so `traj schema projection run --json` and `traj schema projection path --json`
  state the new tables and `yearStart`. `yearStart` is written right after `currency`, in the schema and in
  `runViewOf`.

### Where the CLI code goes

| File | Holds |
|---|---|
| `src/projection/flags.ts` | `reportingFlags` (the three flags), spread into `run` and `path` |
| `src/projection/reporting-input.ts` (new) | `ReportingInput`, `reportingOptionsOf` and its four refusals |
| `src/projection/cashflow.ts` | `linesOf` exported as `linesOf(lines: CashflowLines): Line[]` (it reads no `index`, `from` or `to`), so a `CashflowBreakdown` and a `ReportingCashflow` share it |
| `src/projection/cashflow-income.ts` | `payoutLines` and `employerLines` take `CashflowLines` instead of `CashflowBreakdown` (lines 15 and 25) |
| `src/projection/cashflow-reporting.ts` (new) | `reportingTablesOf(projection, reporting, currency): ProjectionTable[] \| AppError`: the six tables; an `internal` failure when the engine omits a key it was asked for, as `cashflowTablesOf` does for `cashflow` |
| `src/projection/span-totals.ts` (new) | `spanTotalsOf` (below) |
| `src/projection/cashflow-totals.ts` | `safeTotals` exported |
| `src/projection/cashflow-human-rows.ts` | the per-transfer rows of `transferRows` split out as an exported `transferLineRows(transfers)`, which `transferRows` calls |
| `src/projection/cashflow-span-human.ts` (new) | `reportingBlocks(data)`: the year blocks, the month tables and the run-out line (Human form) |
| `src/projection/cashflow-human.ts` | the six tables join `HIDDEN_TABLES` |
| `src/projection/render.ts` | `projectionHint.blocks` gains `...reportingBlocks(data)` right after `...cashflowBlocks(data)`; `pathHint` (`path-human.ts`) spreads `projectionHint.blocks`, so `projection path` prints them too with no change of its own |
| `src/projection/run-tables.ts`, `run.ts`, `path.ts`, `liabilities.ts`, `run-view.ts`, `run-table-view.ts` | `Wants.reporting`, the `optionsOf` parameter, the call to `reportingTablesOf`, `yearStart`, the six table views (in a new `reporting-table-view.ts` if `run-table-view.ts` would pass the file limit) |

### Totals from lines

A Reporting year or month has no roll-up row, so its totals read its lines only, in one function,
`spanTotalsOf(lines, currency, to)` in `src/projection/span-totals.ts`, that shares `sumOf` and the
overflow refusal (`safeTotals`, exported) with `cashflowTotalsOf`:

| Total | Lines |
|---|---|
| money in | income + payout + withdrawal + drawn |
| tax | prepaid + settlement |
| withdrawals | withdrawal |
| drawn | drawn |
| spending | expense |
| saving | contribution |
| not funded | unfunded |
| left over | surplus |
| unmet | unmet |

A test runs both functions over every Annual roll-up of the `--breakdown` goldens and pins that they agree,
which holds while a roll-up's `income` is its income plus payout lines, `expense` its expense lines,
`contributions` its contribution lines, `unfundedContributions` its unfunded lines and `unmet` its unmet line
(sim ADR 0018). If that test fails on any golden, the implementer stops and reports: it is a design question,
not a test to adjust. A total past the safe integers is refused as `VALUE_OVERFLOW` on the span's `to`.

### Human form

- The six tables join `HIDDEN_TABLES` in `cashflow-human.ts`, so a person never sees them raw; the blocks
  below print instead.
- `--breakdown-years` prints one block per Reporting year, headed
  `cash flow 2026, 2026-11-15 to 2026-12-31 (partial)` (a full year drops `(partial)`), with the
  `BLOCK_COLUMNS` of ADR-0058. A Reporting year has no annual row, so every figure is a `cashflowYearTotals`
  total or a sum of the year's own lines (`sumOf` over its `cashflowYears` rows), never a roll-up field. The
  rows, in order, and when each appears:

  | Row | Figure | Printed |
  |---|---|---|
  | `money in` | total `money in` | always |
  | `  income` | sum of the `income` lines | always |
  | `  payouts` | sum of the `payout` lines | when the year has a `payout` line |
  | `  withdrawals` | total `withdrawals` | when the year has a `withdrawal` line |
  | `  drawn` | total `drawn` | when the year has a `drawn` line |
  | `tax` | total `tax` | when the year has a `prepaid` or `settlement` line |
  | `spending` | total `spending` | always |
  | `  <category>` | each `category` line, `(uncategorised)` for a null id | one per line |
  | `saving` | total `saving` | always |
  | `not funded` | total `not funded` | when not zero |
  | `left over` | total `left over` | always |
  | `unmet` | total `unmet` | when not zero |
  | `moved between accounts (not cash)` | sum of the year's `cashflowYearTransfers` amounts | when the year has a transfer row |
  | `  <flow>: <source> to <target>`, `  <flow>: not moved` | `transferLineRows` | under it, as ADR-0070 |
  | `employer paid in (not cash)` | sum of the `employer` lines | when the year has an `employer` line |

  The ADR-0058 block's `fees charged (not cash)` row is left out: an Account's fee is a roll-up field and a
  Reporting span has no fee line (sim ADR 0034). `--breakdown` still prints it per Annual roll-up.
- `--breakdown-months` prints one table per Reporting year, headed `cash flow by month, 2027`, with the
  columns `month`, `money in`, `tax`, `spending`, `saving`, `left over` and `unmet`, one row per month. A partial
  month is written `2027-02*`, and a table with one adds the line
  `* partial: the month is cut by the As-of, the horizon or the date the money runs out.` The
  table leaves out the line detail; `--json` states every line.
- Both come after the `--breakdown` block when several are asked for.

### Help examples

`projection run` gains two examples, run by `src/help-examples.test.ts` (rule 7) on the projection fixture
the other examples use (no new setup):

```text
traj projection run --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --breakdown-years --breakdown-months first --json
  The cash flow per calendar year, and the months of the first one.
traj projection run --scenario base --as-of 2026-03-31 --horizon 2027-03-30 --breakdown-months 2026 --year-start 4 --json
  The months of the Reporting year that begins on 1 April 2026.
```

The first states years 2026 (2026-03-31 to 2026-12-31) and 2027 (2027-01-01 to 2027-03-30) and the ten months
2026-03 to 2026-12; the second, with years from 2025 to 2026, states the twelve months 2026-04 to 2027-03, the
last one partial. Both exit 0. If `run-examples.ts` would pass the file length limit, the two go in
`run-examples-reporting.ts`, spread into `RUN_EXAMPLES`.

### How the Dashboard reads it

- Snapshot: `traj projection run ... --breakdown-years --breakdown-months first [--year-start M] --json`.
- Another year, on demand: `traj projection run ... --breakdown-months <year> --year-start M --json`, where
  `<year>` is a `year` of `cashflowYearTotals` and `M` is the Snapshot's `yearStart`.
- The hosted Demo writes the second answer for every `year` as a static file at build time.

The Dashboard, its loopback route and the Demo files are follow-up issues; this ADR fixes the CLI contract
they read.

## Worked numbers

The goldens use sim ADR 0034's case A, in THB: As-of 2026-11-15, horizon 2027-02-10, pay 1,000.00 a month from
2026-11-30, rent 600.00 a month from 2026-12-01 drawn from cash.

`--breakdown-years` (year start 1):

| year | from | to | partial | money in | drawn | spending | left over | other totals |
|---|---|---|---|---|---|---|---|---|
| 2026 | 2026-11-15 | 2026-12-31 | true | 2600.00 | 600.00 | 600.00 | 2000.00 | 0.00 |
| 2027 | 2027-01-01 | 2027-02-10 | true | 2200.00 | 1200.00 | 1200.00 | 1000.00 | 0.00 |

With `--year-start 11` there is one Reporting year, 2026, from 2026-11-15 to 2027-02-10, partial: money in
4800.00, drawn 1800.00, spending 1800.00, left over 3000.00.

`--breakdown-months first`: 2026-11 (2026-11-15 to 2026-11-30, partial) money in 1000.00, left over 1000.00;
2026-12 (full) money in 1600.00, drawn 600.00, spending 600.00, left over 1000.00.

`--breakdown-months 2027`: 2027-01 (full) as 2026-12; 2027-02 (2027-02-01 to 2027-02-10, partial) money in
600.00, drawn 600.00, spending 600.00, left over 0.00.

In every span money in plus unmet equals tax, spending, saving and left over (ADR-0058).

## Tests

- The goldens above, JSON and human, for `projection run`; `projection path` on the same plan states the same
  `cashflowMonths` for `--breakdown-months first`.
- Validation: `--year-start 0`, `13` and `1.5`; `--year-start 4` alone; `--breakdown-months 26`, `2026-11`, `latest`,
  `2025` and `2028` are each refused with the row above; `2027` is accepted. `--horizon` before `--as-of` with
  `--breakdown-months 2027` gives the engine's `HORIZON_BEFORE_START` refusal, not a range row. Each for
  `projection run` and `projection path`.
- `reportingOptionsOf` writes no key as `undefined`: `--breakdown-years` alone gives exactly
  `{ yearStart: 1, years: true }`, `--breakdown-months first` alone exactly `{ yearStart: 1, monthsOf: "first" }`.
- The human form of `projection run` and `projection path` with both flags prints no raw `cashflowYears`,
  `cashflowYearTotals`, `cashflowYearTransfers`, `cashflowMonths`, `cashflowMonthTotals` or
  `cashflowMonthTransfers` table, and prints the year blocks and month tables.
- A run-out (sim ADR 0034 case B): `--breakdown-months 2027` states empty tables and the human line.
- `spanTotalsOf` agrees with `cashflowTotalsOf` on every roll-up of the `--breakdown` goldens.
- Every existing golden and help example keeps its bytes without the new flags.
- `traj schema projection run --json` lists the six tables and `yearStart`.

## Considered options

- **A valued `--breakdown` (`--breakdown=monthly`).** Breaks every existing call, and the parser cannot
  give one flag two kinds.
- **Moving `--breakdown` to the Reporting year.** Changes the bytes of every existing breakdown, and the
  Annual roll-up stays the frame of the annual table and the FI answer.
- **`--breakdown-months` with no value meaning every month.** A Snapshot of a forty-year plan would carry
  480 months it does not show; the Dashboard needs one year per read.
- **Keying a year by its index.** The index changes with the As-of; the year's number does not, and the
  Dashboard already states it.
- **Totals from roll-up fields.** A Reporting span has none; lines are the only figure it has.

## Consequences

- The Snapshot grows by the Reporting years and twelve months, not by every month of the plan.
- A user sees January-to-December years by default with no flag beyond `--breakdown-years`.
- ADR-0058 is amended (addendum below in that ADR). Its own tables, totals and bytes are unchanged.
- The Docs Portal pages for `projection run` and `projection path` follow at release (rule 6).
