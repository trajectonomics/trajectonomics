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
- **The lowest year.** For each path, the lowest roll-up spending from the first roll-up a rule Flow
  paid in (the first with a figure above 0) through the last full roll-up, the final roll-up being
  excluded only when the horizon clips it. Then the same five Percentiles across the paths that have
  one, with their count. A path that paid in no roll-up, or first paid after the last full one, has no
  lowest year and is not in the sample; with no such path the Percentiles are an empty list and the
  count is 0. A path that ran out has 0 in every later full roll-up, so its lowest year is 0: that is
  the figure "how bad does a bad year get" reports, and the Percentile at level 10 is 0 whenever at
  least a tenth of the sample ran out.
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
- Where the rule starts part-way through a roll-up (a Flow gated by a Milestone), that roll-up holds
  only the Occurrences after the start, and the lowest year includes it, as the issue states. A caller
  that wants a whole-year figure compares the Bands of the rule's first full roll-up.
- The independent check is `golden/oracle-spending.ts`: it replays seeded paths of a cash plan by its
  own PRNG stream, month walk and rule year, computes each roll-up's spending and the Percentiles by a
  count-at-or-below definition rather than by index, and agrees with every Band and lowest-year
  Percentile of 40 paths over three seeds.
