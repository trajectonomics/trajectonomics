# A spending rule is the engine's fourth amount form, and `projection run --spending` and `projection chance` state what it pays

Status: accepted. Ships in 0.8.0 (`projection run --spending`, the spending Bands of `projection chance`).

A person spending from their savings in retirement states a rule: a share of what the portfolio is worth, kept level
in real terms, or a share of each year's value with limits, or a share that cuts after bad years and raises after
good ones. The engine has it (sim ADR-0023) and its spread over Market paths (sim ADR-0024). A person, an agent and
the Dashboard need three things from `traj`: how to write the rule into a Scenario, what it pays each year and why,
and what it pays in bad markets as well as how often the plan holds. The CLI adds no rule and computes no figure of
one; it publishes the document form and states the engine's statement and Bands.

## Decision

- **The rule is the document's, and the engine's.** An expense Flow takes `rule` in place of `amount`, `derive` and
  `level`, with no `growth`. `traj schema scenario apply` publishes it as one object (`src/scenario/shape/rule-shape.ts`)
  with every key of the three kinds: `kind` (`initialRate`, `currentRate`, `guardrails`), `portfolio` (distinct asset
  Accounts, none a liability or marked `liquid: false`), `rateBps`, `rounding` (required, no default), and per kind
  `steps`, `floor` and `ceiling` (`currentRate`) or `upper` and `lower` (`guardrails`, at least one). The kind's own
  keys are said in the descriptions and refused by the core's `check()`, as every other rule of the document is
  (ADR-0024): the shape tests probe each path, each closed set and each `required` list against the pinned core.
- **`traj` ships no rate.** The document says so in its prose and in the rule's description. No rate, band, bound,
  rounding or portfolio is a default anywhere in the CLI. The worked example states its own, as example values: a
  `retirement-spending` Flow whose `guardrails` rule reads `cash` and `index` at 4%, with bands of 20% around the
  rate and a 10% move each way, rounding down, gated by the example's `retire` Milestone. The prose also shows the
  `initialRate` form in a Flow the pin accepts. The example's salary, rent and monthly investment end at `retire` (`endAt`), so the rule is what
  pays from then on; its wealth criterion is now 100,000 THB in start-of-plan money, which the example's plan reaches
  before the date criterion (2045-01-01), so the Milestone fires in a projection that runs that far (at 500,000 THB it
  never did).
- **A level amount is no rule.** An expense with `growth: "inflation"` already keeps pace with inflation, and the
  prose says so; the Dashboard writes it as that.
- **`--decimal` writes a rule's rates as percent strings.** `rateBps`, a step's `bps` and a guardrail's `bps` and
  `adjustBps` read and print as `"4.00"` for 400 basis points, with at most two places; a floor's and a ceiling's
  `amount` read and print as major units, as any money field does (ADR-0047). The fields are found as money is: by their
  description's unit (`RULE_RATE_UNITS`, `YEARLY_UNITS` in `src/scenario/shape/terms.ts`), so `traj schema`
  and the conversion read one schema, and a test names the current rate fields. No other rate is converted: an
  Account's `rate`, a growth's `bps` and the economy's `inflation` stay integers. The conversion is text and integers
  (`src/scenario/percent.ts`), never a float, so a rate round-trips exactly. A value with more than two places is not a
  whole number of basis points and is refused at its path as `invalid_input`, never rounded; trailing zeros past two
  places are accepted. `--set` values in a What-if follow the same form (ADR-0056).
- **The five rule codes are said in words.** `RULE_NOT_EXPENSE`, `RULE_PORTFOLIO_LIABILITY`,
  `RULE_PORTFOLIO_ILLIQUID`, `RULE_FREQUENCY` and `RULE_FLOOR_ABOVE_CEILING` leave `refusal-elsewhere.ts` (where they
  were `never`) for a table of sentences with a hint (`src/projection/refusal-rule.ts`), as the loan and trade codes are.
  They are found by the document check alone, so `scenario apply`, `--set`, the Store and `projection run` on a stored
  row state them at the path of the field that is wrong. `NEXT_12_MONTHS_READS_ACCOUNT` gets a sentence that names the
  rule Flow case and the way out: `trailing12Months`, or a rule Flow whose `startAt` names the Milestone the Metric
  sits on. `scenario apply` states a worded code's sentence as well (the document form's refusal read the code
  and its path only, so the sentences of the loan and trade codes now reach it too).
- **`--spending` states each Rule year.** `projection run --spending` adds a `spendingRules` table (ADR-0027), present
  only with the flag: one row per rule Flow and Rule year, in Scenario order, `{ flow, date, portfolio, amount, paid,
  withdrawalRate, action }`. Money is a decimal string; `withdrawalRate` is the engine's `withdrawalRateBps` as a percent
  string, absent when the portfolio was worth nothing, and not capped (it exceeds `"100.00"` on a depleted
  portfolio); `action` is the engine's (`none`, `floor`, `ceiling`, `cut`, `raise`). `paid` is the engine's, which
  counts the Occurrence a Shortfall fell on in full. A plan with no rule Flow gets an empty table. The human form
  prints, only with the flag, a table per rule Flow by Rule year after the body; the long table is JSON's.
- **Without the flag every output is byte for byte what it was.** A test compares the run with and without it.
- **`projection chance` adds the spending Bands.** When the plan has a rule Flow the result adds `spendingBands`,
  one row per roll-up end `{ index, to, spending }` with the five Percentiles at levels 10, 25, 50, 75 and 90, and
  `lowestYearSpending`, `{ paths, spending }`: the Percentiles of each path's lowest whole year of spending, over the
  `paths` that have one (sim ADR-0024: a path that ran out counts 0 wherever it ran out; a roll-up a rule starts or ends
  part-way through is not a whole year). Otherwise the result has neither key, no spending table and no spending note,
  and is byte for byte what it was. The human form prints, after the net-worth Bands, a few of the spending Bands (the
  first, every fifth and the last, as the net-worth Bands) and the one lowest-year row. The figures are the engine's,
  nominal.

- **The Dashboard's contract accepts the new tables.** The projection run contract decodes `spendingRules` and the
  chance contract decodes `spendingBands` and `lowestYearSpending` (and the two human tables), each against the CLI's
  own goldens; the reports export lists the new table. No page reads them yet.

## Considered options

- **A key per kind, or a union in the schema.** Rejected: the decimal form's walk follows `properties` and `items`, not
  `anyOf` (ADR-0047), so a union would hide the rates and bounds from the conversion. One object with the kind's keys
  said in prose is what a Flow already is.
- **Percent as the stored unit.** Rejected: the engine's unit is basis points and the stored document stays the
  core's. Percent is a presentation of the same number, as major units are of minor ones.
- **A default rate, band or rounding in the example's text or in a flag.** Rejected: which share a person spends is
  theirs to decide, and a default would read as advice.
- **A `--spending` figure for each Percentile of the Rule years.** Rejected: the Bands over paths are the spread.

## Consequences

- **`realAmount` is not stated.** The engine's Rule year has no real (start-of-timeline) amount, and the CLI computes
  no money, so `--spending` states nominal figures only; a Dashboard that shows spending in real terms needs the
  engine to state it, as it states `realNetWorth`. The `realBalances` of `--accounts` are not a substitute.
- **The example's wealth criterion changed**, so every document or golden that holds the example's `retire` Milestone
  changed with it (`run-accounts.output`'s Scenario hash); its figures did not, because that run ends before 2045.
- **A Milestone with a `next12Months` Metric beside a home** is refused whatever a rule's `startAt` says, because the
  home's purchase and sale make it an Account a Flow changes (sim ADR-0020); the example has no such Metric.
