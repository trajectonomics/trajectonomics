# What more of a contribution label would save: a whole-step scan over the Levy, in sim

Status: accepted

A person who files in Thailand can lower a year's tax by putting more into RMF, ThaiESG and the other
retirement allowances, up to caps that depend on income and on each other. Before the year ends they
want to know how much more would still pay and what it saves. The answer has to use exactly the rules
the Projection charges. The Thai Levy freezes its fixed allowances into one constant, so the tax
calculator cannot be rebuilt from a stored Scenario; the Levy itself can be re-evaluated, and every
Settlement period reports each of its `tally` Measure values.

## Decision

- **`contributionSavings(levy, period, options)`.** It rebuilds the period's Tallies from the `tally`
  Measures the period reports (label and basis from the Levy, value from the period, 0 for a Measure
  the period omits), evaluates with the context the engine used (the Due date, the period's last day
  and the stated `inflation`), and returns `dueBefore`, `dueAfter` and one entry per label.
- **Why sim, and generic.** A Levy is data. The scan reads only Measures and Tallies, so it has no
  Thai rule in it and works for any Levy; the Thai fixed allowances being fused into one constant is
  the reason it cannot live in the tax package.
- **Steps, not bisection.** A label's `funded` Tally is raised one `step` at a time and the Levy
  re-evaluated; the label stops at the first step not taken. That assumes no convexity: a Levy whose
  `due` is not monotone in a tally still gets a correct "the first step that does not pay" answer,
  where a bisection would silently skip over a dip. Every suggested amount is a whole number of steps.
- **A step is taken** when `due` falls by more than 0 and by at least `ceil(step × minSavingBps /
  10000)`, and the budget left covers it. Checks run in that order, so a label that reached its cap
  says `noSaving` even when the budget is also used up. A step that straddles a cap saves part of a
  step and is taken; `minSavingBps` leaves it out.
- **A bound, refused not cut.** `maxSteps` limits the steps taken over all labels. A step past it
  returns `TOO_MANY_STEPS` at `["maxSteps"]`, so no answer is a guess cut short and the caller is
  told to use a bigger step. `stoppedBy` is therefore one of `noSaving`, `belowMinSaving` and
  `budget`; a stop by the bound cannot occur.
- **No order search.** Every allowance lowers the same net income, so the order decides which funds
  hold the money, not how much tax falls. The caller's order is used as given, and a label starts
  from what the earlier labels left.
- **Errors as data.** `INVALID_OPTION` (at the key, or `["labels", i]` for a repeated label),
  `UNKNOWN_FUNDED_LABEL` (at `["labels", i]`), `TOO_MANY_STEPS`, `VALUE_OVERFLOW` and
  `NOT_SAFE_INTEGER` come back as `{ ok: false, problem }`. The first three join `ERROR_CODES`.
- **Exact identity.** `dueBefore − dueAfter` is the sum of the labels' savings, because each label's
  saving is the fall between the `due` it started from and the `due` it left.

## Consequences

- The result is a statement about one period's Levy, not advice. It never writes a Scenario: the
  caller turns it into Flows if the person chooses, and holding rules of each fund are not checked.
- The cost is at most `maxSteps + labels` Levy evaluations after the first.
- Checked against an oracle that evaluates every whole-step count from scratch, by hand on a
  Thai-shaped Levy, and pinned by a parity case under Bun and Node.
