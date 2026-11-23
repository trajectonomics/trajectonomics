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
  says `noSaving` even when the budget is also used up. `minSavingBps` is 0 to 10,000.
- **A step must not go past a cap (the grain).** A step that straddles a cap still saves for the part
  under it, so "take any step that saves" would suggest more than the cap allows (a 350,000 RMF label
  with a 360,000 cap and 50,000 steps would end at 400,000). The caller states `grain`, one major
  unit in minor units, from 1 up to `step`. When a label stops with `noSaving` after at least one
  taken step, the scan evaluates `due` with the last taken step's last grain removed. If that equals
  the `due` with the whole step, the last grain saved nothing, so the step went past the flat point
  (a cap, or the end of taxable income): the step is dropped and the Tallies, `due`, step count and
  budget go back to before it. A step that ends exactly on a cap is kept, since its last grain still
  saves. This is one extra evaluation per label, assumes no convexity, and keeps every amount a whole
  number of steps. A cap that is not a multiple of the step leaves room unused (up to one step); a
  smaller step fills more of it. Hand case: salary 1,200,000, RMF cap 360,000, step 50,000, grain 1:
  RMF takes 350,000 (saving 69,000), not 400,000 (70,500).
- **The period must be this Levy's.** The first evaluation's `due` must equal the period's reported
  `due`; a mismatch (a wrong `inflation`, or a period of another Levy) is `PERIOD_DUE_MISMATCH`.
- **A bound, refused not cut.** `maxSteps` limits the steps taken over all labels. A step past it
  returns `TOO_MANY_STEPS` at `["maxSteps"]`, so no answer is a guess cut short and the caller is
  told to use a bigger step. `stoppedBy` is therefore one of `noSaving`, `belowMinSaving` and
  `budget`; a stop by the bound cannot occur.
- **No order search.** Every allowance lowers the same net income, so the order decides which funds
  hold the money, not how much tax falls. The caller's order is used as given, and a label starts
  from what the earlier labels left.
- **Errors as data.** `INVALID_OPTION` (at the key, or `["labels", i]` for a repeated label),
  `UNKNOWN_FUNDED_LABEL` (at `["labels", i]`), `TOO_MANY_STEPS`, `PERIOD_DUE_MISMATCH` (at
  `["period", "due"]`), `VALUE_OVERFLOW` and `NOT_SAFE_INTEGER` come back as `{ ok: false, problem }`.
  The first four join `ERROR_CODES`. A missing or non-positive `grain` is `INVALID_OPTION` at `["grain"]`.
- **Exact identity.** `dueBefore − dueAfter` is the sum of the labels' savings, because each label's
  saving is the fall between the `due` it started from and the `due` it left.

## Consequences

- The result is a statement about one period's Levy, not advice. It never writes a Scenario: the
  caller turns it into Flows if the person chooses, and holding rules of each fund are not checked.
- The cost is at most `maxSteps + 2 × labels` Levy evaluations after the first (each label's stop
  and its one probe).
- Checked against an oracle that evaluates every whole-step count from scratch, by hand on a
  Thai-shaped Levy and on the emitted Thai Levy through `project()` (in the CLI package), and pinned by a parity case under Bun and Node.
