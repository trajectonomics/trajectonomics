# Cash-flow breakdown: one report per Annual roll-up, by source, Levy, category and Account

Status: accepted

A person asks where each year's money came from and where it went. `AnnualRollup` has totals only
(income, expense, contributions, levy, interest, unmet), with no split by Flow, Account or category,
and withdrawals and surplus fills are not reported at all. The page may compute nothing (web ADR 0002),
and the CLI cannot rebuild the routing (cli AGENTS rule 3), so the engine reports the breakdown. This
ADR adds that report under [ADR 0017](./0017-liability-statements.md)'s option pattern, as the first
slice of the yearly cash-flow breakdown (#190).

## Decision

- **Opt-in through `project`'s options.** `ProjectionOptions` gains `cashflowBreakdown?: boolean`.
  Without it the Projection is byte-identical: no key, no observation date, and the run records no
  lines. The engine records each date's lines only when the run is asked to (`runEngine`'s breakdown
  flag), so Financial Independence and chance runs keep their figures and take the same time within
  noise (`bun run bench` before and after, same machine).
- **One breakdown per Annual roll-up.** `Projection.cashflow` lists one `CashflowBreakdown` per
  roll-up, with the same `index`, `from` and `to`. It has these lines:
  - `income`: planned gross per income Flow, before Prepayment.
  - `prepaid`: Prepayment per Levy.
  - `settlements`: each Levy's Settlement, signed, so a refund is negative. A Settlement is in the
    period that contains its settlement date, as the roll-up's `levy` field already places it.
  - `expenses`: planned per expense Flow, with its `category` when it declares one.
  - `categories`: expenses summed per exact category string. Order is the first expense Flow in that
    category, in Scenario order; `null` (no category) comes last.
  - `contributions`: per contribution Flow, the `applied` amount into its Account (a debt payment or an
    asset grant) and the `unfunded` part.
  - `withdrawals`: planned withdrawal Flows, with the liability each borrowed from.
  - `drawn`: what `cashflow.withdraw` gave up, in list order.
  - `surplus`: what `cashflow.surplus` filled, in list order.
  - `unmet`: the Shortfall left when the run ends.
  Lines follow Scenario order (Flows, Levies) or the routing list order, and a line whose amount is zero
  over the period is omitted.
- **Every figure is what the engine applied.** A Flow's amount is the occurrence amount the engine
  landed (a fixed amount grown, or a Derived amount evaluated that date). A Levy's Settlement is the
  Levy's own Settlement on that date. Contributions, withdrawals, drawn and surplus are read where the
  engine moved the money. Nothing is recomputed.
- **The identity, exact in minor units, per roll-up:**
  `Σincome + Σwithdrawals + Σdrawn + unmet = Σprepaid + Σsettlements + Σexpenses + Σcontributions.applied + Σsurplus`.
  The routing spends every unit of cash, so there is no change-in-cash term. A positive net fills
  surplus, whose last step is unbounded (`SURPLUS_UNROUTED`), and a negative net is drawn through
  `withdraw` or ends the run as `unmet`. Each total equals its roll-up field: `income`, `expense`,
  `contributions`, `unfundedContributions`, `levy` (= Σprepaid + Σsettlements), `withdrawals` and
  `unmet`, and Σcategories equals Σexpenses.
- **Same-date contributions split back to Flows.** [ADR 0003](./0003-cap-asset-contributions.md) sums
  same-date contributions per Account before its cap. The breakdown then splits each Account's applied
  amount back to its Flows in Scenario order, first come first served. An asset Flow's unfunded part is
  its planned amount less its applied amount. A debt payment capped at the amount owed is not
  unfunded, which matches `unfundedContributions`, so the planned-but-owed gap is in no line.

## Considered options

- **Always report the breakdown.** Rejected: it would change every existing Projection's bytes, and the
  parity hashes with them.
- **Compute it in the page or the CLI from the rows.** Rejected: the rows do not carry the routing, and
  the page may compute nothing (web ADR 0002).
- **Split same-date contributions in the engine's id order.** Rejected: the report follows the order the
  person declared the Flows in, and the engine's own split of the Account still decides every balance.
- **A cash line, so the identity carries a change in cash.** Rejected: no cash is held back, so the
  line would always be zero.

## Consequences

- Existing parity hashes are unchanged. Five cases are added to `parity/cases.json`, all with the
  option: `cashflow-hand-year`, `cashflow-categorised-freelancer`, `cashflow-levy-refund-day`,
  `cashflow-levy-shortfall-day` and `cashflow-loan-borrow-day`.
- The hand-worked year (`src/golden/cashflow-cases.ts`) has its figures written out by hand in
  `cashflow-breakdown.test.ts`, and an independent day-by-day oracle (`src/golden/oracle-cashflow*.ts`,
  which imports nothing from the engine) agrees line by line. The oracle models no Settlement and no
  capped Prepayment, so it covers the hand-worked year only.
- Every parity fixture is checked with the option on: every other figure is unchanged, and the identity
  and the roll-up totals hold.
- A Levy's Settlement falling beyond the horizon is not in the breakdown, as its `levy` field is not.
