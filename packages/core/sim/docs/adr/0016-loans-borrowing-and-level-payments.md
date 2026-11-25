# Loans: a planned withdrawal borrows into a liability, and a level payment is computed from principal, rate and term

Status: accepted

A liability could grow only through a Contribution's debt, so a loan that starts after `Timeline.start`
(a car bought in a later year) could not be written, and a loan's payment had to be typed by hand. A
typed payment goes stale when the principal changes. This ADR adds the two primitives: a
**planned withdrawal** that borrows into a liability, and a **level payment** computed exactly from
principal, nominal rate and number of payments. Both keys are optional and additive, so
`Scenario.schemaVersion` stays 4 (precedent: [ADR 0012](./0012-milestones.md)).

## Decision

- **Planned withdrawal.** `FLOW_KINDS` gains `withdrawal`. A withdrawal Flow names a `source` Account.
  On each Landed date the source's amount owed grows by the Flow's amount and the same cash joins
  cashflow, so net worth is unchanged that day. `check()` refuses an asset source with
  `WITHDRAWAL_SOURCE_KIND` at `source`; assets are a later slice. A withdrawal is not income: it is
  never earned, never tallied and does not stop in the FI test. It takes a fixed or Derived amount and
  the usual gates.
- **Order on a date.** Planned withdrawals raise their liabilities first, in source-id order, so a
  same-date debt payment sees the amount owed the withdrawal created. Then the day's debt payments
  are read and the cash is netted: withdrawn cash joins the net that pays a Shortfall or lands as surplus.
- **Owner decision: Available cashflow excludes withdrawn cash.** Cash from a planned withdrawal never
  counts toward Available cashflow, the ceiling on asset Contributions ([ADR 0003](./0003-cap-asset-contributions.md)).
  A loan pays for what it was raised for and the rest lands in surplus, but a plan never looks like it
  saves more because it borrowed. Available cashflow is unchanged in formula.
- **Level amount.** A Contribution whose `target` is a nominal liability may carry
  `level: { principal, payments, rounding }` instead of `amount` or `derive`. `rounding` is required,
  with no default. With `i = rate / (10000 · m)` and `n = payments`, the payment is
  `principal · i · (1+i)^n / ((1+i)^n − 1)`, and `principal / n` at a zero rate. It is computed exactly
  as a BigInt fraction, `P · a · (b+a)^n / (b · ((b+a)^n − b^n))` with `a = rate`, `b = 10000 · m`, and
  rounded once by `roundedDivide` (the Measure roundings). It does not grow.
- **Frequency is the compounding period.** A level Contribution's `frequency` is the target's
  Compounding period: `monthly` for monthly, `quarterly` for quarterly, `annual` for annual. A
  `semiannual` target has no Flow frequency, so it is refused.
- **Term bound.** `payments` is 1..119,976, which is 9,998 years of monthly payments, the calendar's
  span. Above that, the exact power is not computed. At the bound a payment costs about 50 ms of
  BigInt work, so `levelPayment` memoises results.
- **Normalisation, not a new engine path.** `buildEvents` resolves each level Flow to a fixed Flow whose
  `amount` is that one payment and whose `growth` is 0. The engine, the FI walk and the chance paths see
  an ordinary fixed Contribution, so they need no change for it.
- **Refusals.** `WITHDRAWAL_SOURCE_KIND` (source); `LEVEL_TARGET_NOT_LIABILITY` and
  `LEVEL_TARGET_NOT_NOMINAL` (target); `LEVEL_FREQUENCY_MISMATCH` (frequency);
  `LEVEL_PAYMENTS_OUT_OF_RANGE` (level.payments); `LEVEL_PAYMENT_OVERFLOW` (level, a payment that is not a
  safe integer). A negative principal is `NEGATIVE_AMOUNT`, an unknown rounding `INVALID_ROUNDING`, and a
  missing one `MISSING_KEY`, each at `level.*`. A `level` beside `amount` or `derive`, or on a non-contribution,
  is `FIELD_NOT_ALLOWED`.
- **Output.** `AnnualRollup.withdrawals` is the planned withdrawals landed in the period. It is present
  only when the Scenario declares a withdrawal Flow, the same rule as `levy`, so a Scenario without one
  keeps every Projection byte-identical. `interest` keeps its formula: a withdrawal that lands as cash
  raises the liability and the cash together, so net worth does not move and the residual is unchanged.
  Withdrawn cash is never dropped: `check` requires the last surplus step to be unbounded
  (`SURPLUS_UNROUTED`), so a capped step hands the rest to the next one and the last takes what is left.
- **Export.** `levelPayment({ principal, rate, periodsPerYear, payments, rounding })` is exported from
  the package index. It returns the payment, or `undefined` when the input is out of range or the payment is
  not a safe integer, so the CLI can show a document's payment without a Projection.

## Considered options

- **A typed payment in the document.** Rejected: changing the principal would leave a stale payment.
- **Compute the payment from an effective annual rate.** Rejected: the nominal rate and its period are the
  contract's terms (ADR 0007), and an effective rate is generally not an integer number of basis points.
- **Count withdrawn cash in Available cashflow.** Rejected by the owner decision above: a loan or a sale
  would then fund a savings target.
- **Always include `withdrawals` in every rollup.** Rejected for parity: it would change every existing
  Projection's bytes. Declared presence keeps the old output.
- **An unbounded term.** Rejected: the power grows with `payments`, so a huge term is an expensive input.
  The calendar's own span is the natural bound.

## Consequences

- The formula assumes each payment lands on a Compounding date. A payment on another day follows ADR 0007's
  capitalised-first debit, so the real schedule may end a payment early or leave a small balance. That is
  reported in the Projection, not corrected.
- A Derived amount that reads a withdrawal with `op: "flow"` reads its planned amount, as for any Flow.
- Existing parity hashes are unchanged. Two cases are added: `loan-level-month` (a level loan repaid on
  month ends, cleared by the 12th payment under `ceil`) and `loan-borrow-day` (a planned withdrawal with a
  same-day expense, showing the withdrawal is not Available cashflow).
- Withdrawals from assets and sale proceeds are [ADR 0021](./0021-buy-and-sell-an-asset.md); `WITHDRAWAL_SOURCE_KIND` is removed there. The CLI and Dashboard vocabulary is a later slice.
