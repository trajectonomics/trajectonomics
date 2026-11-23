# Spending Bands: what a spending rule pays across Market paths

Status: accepted

Amends ADR 0011 (chance of success) and builds on ADR 0023 (spending rules).

ADR 0011 left expense Bands out: income and expense were deterministic until a path is truncated, and
the Runs-out counts said where a path stopped. A Spending rule makes the expense a function of the
path, and a rule that follows the portfolio almost never runs out, so its Success probability says
little. What changes is how much the person gets to spend in bad markets. A person comparing a fixed
amount with a guardrails rule needs the spread of what each pays, year by year, over the same Market
paths.

## Decision

- **When.** `chanceOfSuccess` adds `spending` to its result when the Scenario has one or more rule
  Flows, and otherwise returns exactly what it returned before: no `spending` key, the same JSON, the
  same parity hash.
- **The figure.** For each path and each Annual roll-up, the sum over every rule Flow of what its
  Occurrences paid on dates inside the roll-up. It is `paid`, not the planned amount or the Rule year's
  `amount`: a person who is cut in a bad market spends less, and that is what the Band is for.
  Nominal, as the rest of the result.
- **A path that ran out.** It pays 0 in every later roll-up, because the run ends on its Runs-out date
  and no Occurrence lands after it. The roll-up it ran out in counts what was paid before that date,
  plus the met share of the failing day below.
- **The failing day.** The Projection counts the Occurrence a Shortfall fell on in full, and
  `SpendingRuleYear.paid` follows it, so neither is what was paid. The engine's `unmet` is the whole
  day across every expense, not the rule's share, so it is split by Flow, never subtracted from one.
  The day's expenses were met up to `expense − unmet` (never below 0), and an Occurrence of planned
  amount `a` on that day paid `floor((expense − unmet) × a / expense)`: every expense on the day gets the
  same share of what was met, in integers, floored so that the figure never exceeds what was met.
  When `unmet` is at least the day's expense (the Shortfall includes a contribution or a debt payment
  that the cash could not meet), the share is 0. Hand case (the first test of `chance/spending.test.ts`):
  1,200,000 in cash, the rule paying 10,000 a month and rent 10,000. A path whose first crash is in
  month 1 holds 116 on 2026-03-01 with 20,000 planned: it paid 10,000 on 2026-01-01, 10,000 on
  2026-02-01 and `floor(116 × 10,000 / 20,000) = 58` on 2026-03-01, so its roll-ups read 20,058 then 0,
  where the Rule year's `paid` says 30,000.
- **The Bands.** At each Annual roll-up end, the nearest-rank Percentiles at levels 10, 25, 50, 75 and
  90 by ADR 0011's integer rule (the element at index `ceil(level × N / 100) − 1` of the ascending sample),
  over every path, a failed path as 0 after it ran out. A tie reports the tied value and a two-value
  sample takes the lower at level 50 (a sample 1, 5, 5, 9 reads 1, 1, 5, 5, 9).
- **The lowest year.** Per path, from the roll-ups that hold a whole year of the rule: a roll-up counts
  only when each rule Flow that paid in it landed a whole year of Occurrences there (twelve for a
  monthly Flow, one for an annual one, counted from the path's own log, the failing day's included). A
  roll-up in which no rule Flow paid, one the horizon clips, and one a Flow starts or ends part-way
  through (a Milestone gate, an `end` date, a start date that is not a roll-up's first day) do not count.
  The path's lowest year is the least of those. A path that ran out has a lowest year of 0 and is always in the sample, wherever it ran out: before the rule
  paid, inside a full roll-up, in the clipped final roll-up or on the horizon day. A path with neither
  a whole year nor a run-out has no lowest year and is left out. Then the same five Percentiles across
  the paths in the sample, with their count `paths`; with no path in it the Percentiles are an empty
  list and the count is 0. So the Percentile at level 10 is 0 whenever at least a tenth of the paths
  ran out, which is the "how bad does a bad year get" figure.
- **Withdrawal rates are not capped.** The Band reports amounts, never rates; `withdrawalRateBps` of a
  Rule year stays above 10000 on a depleted portfolio (ADR 0023).
- **Reuse.** No extra engine run: the path's own run carries a log of each rule Occurrence's date and
  planned amount in its rule book, opened with a flag that only `chanceOfSuccess` sets
  (`runEngine(..., recordRules)`), so Financial Independence and every Projection keep a book byte for
  byte as it was. A path's roll-up figures are folded as soon as its run ends, one path's log in memory at
  a time, as before.
- **Shape.** `spending: { bands, lowestYear }`: `bands` one row per roll-up `{ index, to, spending }`
  with the five `{ level, value }`; `lowestYear` is `{ paths, spending }`.
- **Overflow.** A roll-up sum that is not a safe integer is `VALUE_OVERFLOW` at the roll-up's end
  date, which fails the whole call as any path problem does (ADR 0011).

## Consequences

- No new check codes. The existing Chance of success parity hash (`freelancer-chance`) is unchanged
  and so is every Projection hash. `rule-current-rate-bounds` carries a chance over a rule Flow, so its
  `chanceSha256` changes by design; `rule-guardrails-chance` is new and pins a guardrails plan.
- A rule that starts part-way through a roll-up (a Flow gated by a Milestone, or a `start` that is not
  a first of January) reports that roll-up's Band as it is, and leaves it out of the lowest year: its
  first Percentile is not a year. A caller that wants the whole-year figure reads the Bands from the
  rule's first full roll-up.
- The independent check is `golden/oracle-spending.ts`: it replays seeded paths of a cash plan by its
  own PRNG stream, month walk and rule year, computes each roll-up's spending, each path's lowest year
  (by counting the months a roll-up held) and the Percentiles by a count-at-or-below definition rather
  than by index, and agrees with every Band and lowest-year Percentile of 40 paths over three seeds, for
  `currentRate` and `guardrails`, a rule starting on 2026-10-01, a rule with an `end`, and a horizon that
  clips the final roll-up.
