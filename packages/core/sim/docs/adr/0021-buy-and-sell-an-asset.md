# Buying and selling an asset: an obligation Contribution pays in full, and a withdrawal from an asset sells it

Status: accepted

A home or a car is bought, held and sold. Holding was possible ([ADR 0019](./0019-illiquid-assets.md):
an asset Account with any rate above −10000 bps). Buying and selling were not. A Contribution into an
asset is a target capped at Available cashflow ([ADR 0003](./0003-cap-asset-contributions.md)), so a
purchase price was dropped as unfunded unless that day's income covered it. Money left an Account only
through `cashflow.withdraw` on a Shortfall, so no Flow could move a named asset's value into cash on a
date. This ADR adds both, as optional additive keys, so `Scenario.schemaVersion` stays 4 (precedent:
[ADR 0012](./0012-milestones.md), [ADR 0016](./0016-loans-borrowing-and-level-payments.md)).

## Decision

### Buying: `funding: "obligation"`

- **The key.** A Contribution into an asset may carry `funding`, one of `target` or `obligation`. Absent,
  or `target`, it is today's target, unchanged. Each rule has its own code. An unknown value is
  `INVALID_FUNDING` at `funding`, and lists `target` and `obligation`. A known value on a liability
  target is `FUNDING_ON_LIABILITY` at `funding` (a debt payment is already an obligation, whatever the
  value), and lists none: an unknown value on a liability is `INVALID_FUNDING` alone, reported once.
  `funding` on an income, expense or withdrawal is `FIELD_NOT_ALLOWED`.
- **Paid in full.** An obligation is subtracted before Available cashflow is computed:
  `available = max(0, income − prepaid − expense − debt paid − obligations paid − Settlement)`. It is
  never capped and never unfunded. Same-date obligations into one Account are summed, and a Contribution
  that is a target and one that is an obligation into the same Account on one date are two groups: the
  obligation is paid first, and the target is funded only from what is left.
- **Not routed.** `cashflow.contribute` need not list an obligation's target, and `CONTRIBUTION_UNROUTED`
  does not apply to it. A target, written or implied, still needs routing.
- **Not into an Account that `withdraw` lists.** An obligation whose target is named in
  `cashflow.withdraw` is `OBLIGATION_TARGET_WITHDRAWN` at the Flow's `target`. The obligation is booked
  into its target first, and then the negative net is drawn through `withdraw`, which could name the
  same Account: with `cash` 0, `brk` 0 and `withdraw: [brk, cash]`, an obligation of 1,000.00 into `brk`
  is booked (brk 1,000.00) and then drawn back out of it (brk 0), with no Shortfall. The purchase paid
  for itself, and with a `gainLabel` and growth the round trip would tally a made-up Realised gain.
  Refusing the Scenario is simpler and clearer than excluding the target from that date's draw: the
  caller who wants to buy into an Account lets it stay out of the list, and the purchase then draws on
  the others. A purchase into a home, or any Account not listed, draws savings as before.
- **Bookkeeping.** The applied amount adds to the Cost basis of an Account with `gainLabel`, and counts
  in a `funded` tally, as for any applied Contribution (the same `mutate` path).
- **Order on a date.** Planned amounts, planned withdrawals (loan draws and sales), debt payments,
  obligations, asset targets, then the net routes to surplus, the `withdraw` list or a Shortfall.

### What an obligation does with cash

The obligation's cash comes out of the day's net, like a debt payment. The net is
`income − prepaid − expense − debt − obligations − Settlement + planned-withdrawal cash − asset targets applied`.

- **Short of cash.** A negative net is drawn through `cashflow.withdraw` in order, as any expense is.
  A purchase of 3,000,000.00 with 1,000,000.00 cash and 2,500,000.00 in savings, `withdraw: [cash,
  savings]`, draws the 1,000,000.00 and then 2,000,000.00 from savings, which keeps 500,000.00, and the
  home holds 3,000,000.00.
- **Shortfall.** When the `withdraw` list cannot cover it, the date is a Shortfall with the unmet
  amount, and the run ends on that date, as for an expense or a debt payment. The purchase is booked in
  full before the Shortfall is found, as a debt payment is: the Account holds the price on the run-out
  row, and the unmet amount is the part of the price no Account could pay. It is not "unfunded".
- **Financing (#276).** A same-date `withdrawal` from a loan's liability raises the amount owed and the
  cash together, and that cash joins the net before it is drawn on. A purchase of 3,000,000.00 with a
  2,400,000.00 draw and 600,000.00 cash leaves cash 0, home 3,000,000.00, loan 2,400,000.00 and no
  Shortfall: only the deposit leaves savings.
- **The owner's rule is kept.** Cash from a planned withdrawal never counts toward Available cashflow
  (ADR 0016). The draw pays the purchase because the purchase is an obligation in the net, not because
  borrowing made a target affordable: a target Contribution on the same date still sees only income.

### Selling: a `withdrawal` from an asset

- **The move.** The `withdrawal` Flow (ADR 0016) may name an asset `source`. On each Landed date it moves
  `min(planned, value)` out of the Account into cash, with growth accrued to the date, through the same
  `mutate` as any draw: a nominal Account's capitalised-first rule applies and a Return series is
  honoured. `WITHDRAWAL_SOURCE_KIND`, which refused an asset, is removed from the closed set.
- **Same-date sales** from one Account are summed and capped by its value together. The amount it gave up
  is split back to the sale Flows in Scenario order for the breakdown, first come first served, as
  contributions into one Account are.
- **Whole asset.** A Derived amount that reads the Account sells all of it:
  `derive: { measures: [{ id: "value", op: "account", account: "home" }], result: "value" }` (ADR 0020).
  The value is read before anything lands, so a sale that reads the Account it sells is not a
  `FLOW_CYCLE`. Only a withdrawal reading its own `source` is exempt. A Flow that changes the Account
  and is read back through another Flow is still a cycle.
- **Realised gain.** The amount withdrawn is tallied through `levy-gains` as a draw from the `withdraw`
  list is: `withdrawn − basis used`. Whether a home sale is taxed is the caller's choice of `gainLabel`.
- **Locked.** An Occurrence before `lockedUntil` moves nothing. `check()` refuses a sale whose `start` is
  before the source's `lockedUntil` and has no `startAt`: `WITHDRAWAL_LOCKED` at `start`, since it could
  never move anything on its first date.
- **Proceeds follow ADR 0016.** They join the net, never Available cashflow, land in surplus or pay the
  day's costs, and are not income. A sale of an illiquid asset therefore moves value from an Account that
  ADR 0019 leaves out of accessible net worth into liquid cash: accessible net worth rises on the sale
  date by what landed (5,000,000.00 from 0 on a hand-worked home). The FI buffer, the reference and the
  accessible Milestones read the new cash from that date.

### Reported

- **Breakdown (ADR 0018).** An obligation is a `contributions` line with `unfunded: 0`; a sale is a
  `withdrawals` line, whose amount is what the Account gave up (a planned 7,000,000.00 from a home worth
  5,000,000.00 is a 5,000,000.00 line), with the Account it left in `account`. The identity
  `Σincome + Σwithdrawals + Σdrawn + unmet = Σprepaid + Σsettlements + Σexpenses + Σcontributions.applied + Σsurplus`
  still holds exactly: the cash of every sale and draw is on the left, every obligation on the right.
  It is checked on every parity fixture, which now includes the new cases, and on a hand-worked year.
- **Roll-up.** `AnnualRollup.contributions` includes obligations. `withdrawals` includes asset sales, and
  is present when the Scenario declares a withdrawal Flow.
- **Statements** (ADR 0017) still list liabilities only: `drawnBy` holds liabilities.

### Financial Independence

- Every candidate's walk runs the engine's own `processDate`, so a purchase or a sale lands in each
  candidate's walk, from the shared prefix or from its own month, with the same routing as a projection.
  Nothing about FI is recomputed. A purchase or a sale gated on a Milestone lands when that Milestone
  fires in the candidate's own walk, as ADR 0012 fixes, so stopping the salary can stop the gate and the
  sale with it.
- **Windows.** The Minimum buffer and the reference plan expenses, and a purchase or a sale is none. An
  expense that reads the Account (ADR 0020, home upkeep) is priced from the candidate's own walk, which
  sees the purchase and the sale: a sold home costs nothing to keep from the sale date, and the walk's
  recorded values say so.
- **Brute force.** `src/golden/oracle-account-fi.ts` re-walks the Scenario per candidate month and now
  lands obligations and withdrawals (`oracle-sale.ts`), importing nothing from the engine. Plans agree on
  the FI month and the reference expense: a whole-home sale gated on net worth 30,000,000 moves the month
  from 1 May 2028 to 1 Nov 2027; the same sale on 1 Jul 2027 to 1 Jul 2027; a 6,000,000 purchase gated on
  net worth 20,000,000 moves it from 1 May 2028 to 1 Nov 2028; with upkeep of a kept home the reference
  expense is 7,400,004 and a sold home's 7,200,000.
- **Refused as before.** A sale that reads an Account is a Flow whose `derive` reads an Account, so a
  Scenario that has one and a Milestone Metric `expenses: next12Months` is `NEXT_12_MONTHS_READS_ACCOUNT`
  (ADR 0020), though the sale is no expense. A stated-amount sale reads nothing and is accepted. No new
  combination needed refusing: nothing here is priced from anything but the candidate's own walk.

## Considered options

- **A capped target that may borrow.** Rejected: ADR 0003's cap exists so saving never pulls on assets.
  A purchase is the other way round and needs its own word.
- **Exclude the target from that date's draw instead of refusing.** Rejected: the draw order would
  differ by date, the same `withdraw` list would mean two things, and the caller would not learn that
  the Account cannot pay for its own purchase.
- **Carry an obligation's unmet part forward.** Rejected: a Shortfall ends the run, as for any expense.
- **Count sale proceeds as Available cashflow.** Rejected by the owner's rule in ADR 0016: a sale would
  fund a savings target.
- **A separate Flow kind for a sale.** Rejected: the `withdrawal` Flow is the same movement, from an
  asset instead of a liability.
- **Refuse a sale that reads its own source as a cycle.** Rejected: it would block the whole-asset sale
  the issue is about, and nothing depends on a same-date landing, since reads precede all landings.

## Consequences

- Existing parity hashes are unchanged (the recorded `cases.json` entries are byte-identical). Four cases
  are added: `buy-home-loan-day`, `buy-home-shortfall-day`, `sell-home-gain-day` and `sell-home-fi`.
- Hand-computed tests: `src/engine/purchase.test.ts` (the loan draw, the `withdraw` list, the Shortfall, an
  obligation beside a target), `src/engine/sale.test.ts` (a Realised gain of 1,000,000.00, a stated amount,
  a planned amount above the value, the owner's rule, a locked source), `src/engine/purchase-breakdown.test.ts`
  (a worked year where the identity is 6,750,000 = 6,750,000), `src/check/asset-flow.test.ts` and
  `src/check/obligation-withdrawn.test.ts` (the refusals).
  `src/golden/buy-sell-oracle.test.ts` and `src/golden/buy-sell-fi.test.ts` hold the oracle's agreement.
- The CLI publishes `funding` on a contribution and lets a withdrawal name an asset
  (`apps/cli/src/scenario/shape/flow-funding.ts` and `flow.ts`); `INVALID_FUNDING`, `FUNDING_ON_LIABILITY`,
  `OBLIGATION_TARGET_WITHDRAWN` and `WITHDRAWAL_LOCKED` are filed in its refusal table, and
  `WITHDRAWAL_SOURCE_KIND` is gone from it.
