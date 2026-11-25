# Liability statements: one monthly record per liability, opt-in, with the paid-off date

Status: accepted

A person with a loan asks how much of each payment is interest, what is still owed after each one,
and when it is paid off, and how much sooner an extra payment clears it. A Projection reports each
Account's value per row and a period-wide `interest` residual (`AnnualRollup.interest`), but not one
loan's interest, payments or payoff. The page may not subtract money (web ADR 0002), and the CLI must
not reimplement engine rules, so the engine reports the schedule. This ADR adds that report to the
Projection, under [ADR 0016](./0016-loans-borrowing-and-level-payments.md)'s loans.

## Decision

- **Opt-in through `project`'s options.** `project(baseline, scenario, timeline, options?)` takes
  `ProjectionOptions { liabilityStatements?: boolean }`. Without the option, the Projection is
  byte-identical to before: no key, no extra observation dates, no extra reads. `ProjectionOptions`
  is the one place a future optional output joins (the cash-flow breakdown of a later slice).
- **One statement per liability.** With the option, `Projection.liabilities` lists one
  `LiabilityStatement` per liability Account in Scenario order, possibly an empty list.
- **Calendar months, cut like the roll-ups.** A month runs from its first day, or from
  `Timeline.start`, to its last day, or to the horizon or the run-out date. It does not depend on
  `resolution`. A cut month is `partial`, and so is a month that a run-out ends, even on its last day.
- **The figures.** `opening` is the amount owed at the start of the month, Accrued interest included;
  the first month opens at the Baseline balance. `drawn` is the planned withdrawals that borrowed from
  the liability in the month. `paid` is the debt payments applied in the month, after the cap at the
  amount owed. `closing` is the amount owed at the month's end, read after that day's flows.
  `interest` is the residual `closing − opening − drawn + paid`, so the identity holds exactly. It
  therefore includes Accrued interest that a mid-month end has not capitalised.
- **Why `interest` is a residual.** The engine already computes interest once, exactly, through
  ADR 0007's capitalisation. A second interest computation would have to match it to the minor unit
  on every path, including the settlement and the capped payment. The residual cannot disagree with
  the balances it reports, and the independent oracle checks the residual against its own walk.
- **Where the moves come from.** A liability's amount owed changes only by a planned withdrawal and a
  debt payment. `surplus`, `withdraw` and `contribute` refuse liabilities (`LIABILITY_MISUSE`), so
  these two are the whole of it. Each day's totals carry the withdrawals and payments per liability,
  and the statement adds them up by month.
- **The paid-off date.** `paidOff` is the first Landed date on which the amount owed reaches zero after
  being above zero. It is read where a liability moved, after the day's flows, so a zero reached
  mid-month is dated to its day. It is absent while the amount owed is never zero.
- **Month ends are observed.** With the option, the engine reads every calendar month end and the
  horizon, so each `closing` is a snapshot. Reading a completed Compounding date only capitalises it,
  which ADR 0007 already allows, so the numbers do not move.

## Considered options

- **Always report the statements.** Rejected: it would change every existing Projection's bytes, and
  the parity hashes with them.
- **A second interest computation in the statement.** Rejected, for the reason above: two computations
  of one interest can disagree, and the residual makes the identity true by construction.
- **Dating the paid-off date from the snapshots.** Rejected: snapshots exist only on observed dates,
  and a loan can reach zero on a payment day that no row reports.
- **A separate output function that re-runs the engine.** Rejected: the statement is read from the same
  run, so its figures are the engine's figures.

## Consequences

- Existing parity hashes are unchanged. Seven cases are added to `parity/cases.json`, all with the option:
  `loan-statement-month`, `loan-statement-extra`, `loan-statement-mid-month`, `loan-statement-borrow`,
  `loan-statement-zero-rate`, `loan-statement-open` and `loan-statement-run-out`.
- The independent oracle (`src/golden/oracle-statement*.ts`) walks every calendar day in exact integers
  and reports each month and the payoff date. It shares only the loan oracle's rounding with the rest of
  the golden suite.
- A statement run adds a read on every month end, and each month end's overflow check. Non-statement runs make neither read and are unchanged.
- `financialIndependence` and `chanceOfSuccess` build no statements: they take no `ProjectionOptions`, and their paths
  (`src/fi/prefix*.ts`, `src/chance/path.ts`) run without the owed tracker. Only `project` with `liabilityStatements: true` reports them.
- A liability named in `surplus`, `withdraw` or `contribute` is already refused (`LIABILITY_MISUSE`), so
  the two moves a statement reports are the whole of a liability's movements. Asset statements are a later slice.
