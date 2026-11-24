# Transfers: money moved between your own Accounts, outside cashflow, with its Cost basis

Status: accepted

Money moves between a person's own Accounts on purpose: a provident fund rolled into an RMF when changing
jobs, a share of savings moved to a fixed deposit every year, a monthly amount from savings paying a loan
down early, a lump sum into a fund at retirement. None of it is income, spending or saving out of this
year's cash. The only way to move money out of an asset was a Planned withdrawal ([ADR 0021](./0021-buy-and-sell-an-asset.md)),
whose cash lands in cashflow and is kept out of Available cashflow, so it could not fund a target
Contribution: the plan either lost the money to surplus or had to state it twice. This ADR adds a fifth
Flow kind, `transfer`. It is additive: the Scenario stays `schemaVersion: 4`, a Scenario with no transfer
runs byte for byte as before, and every existing parity hash is unchanged.

## Decision

- **The Flow.** `{ kind: "transfer", source, target, realise? }` with the usual window, gates and
  frequency, and an `amount` with `growth` or a `derive`. `level` and `rule` are refused
  (`FIELD_NOT_ALLOWED`, `RULE_NOT_EXPENSE`), as are `funding`, `label`, `prepayments` and
  `cappedPrepayment`. A share of the source is a Derived amount that reads it ([ADR 0020](./0020-derived-amounts-read-an-account.md)):
  `scale(account, 1, 10)` is a tenth, and the bare `account` read is all of it. The read comes before
  anything lands, so a transfer that reads its own `source` is no cycle (as a sale is none). A transfer that
  reads its `target` is a `FLOW_CYCLE`, as a Contribution that reads its own target is.
- **Source.** An asset Account that is not Illiquid: an Illiquid source is `TRANSFER_FROM_ILLIQUID` (a sale is
  a Planned withdrawal) and a liability is `TRANSFER_FROM_LIABILITY` (borrowing is one), both at `source`. The
  same Account as source and target is `TRANSFER_SAME_ACCOUNT` at `target`. A locked source moves nothing
  while locked, as a sale; a transfer whose `start` falls before `lockedUntil` with no `startAt` could never
  move anything on its first date, so `check()` reuses `WITHDRAWAL_LOCKED` at `start`.
- **Target.** An asset (Illiquid and locked ones allowed: savings into a home, a provident fund into a locked
  RMF) or a liability. Money into a liability pays it down, as a debt payment does, and the liability never
  goes below zero: the transfer moves `min(planned, source value, amount still owed)` and the rest stays in
  the source. A nominal loan's Accrued interest is part of what is owed ([ADR 0007](./0007-nominal-compounding.md)).
- **What moves.** `min(planned, what the source holds)`, with growth accrued to the date through the same
  `mutate` as any change to an Account, so a nominal Account's capitalised-first rule holds and a Return
  series is honoured: a change inside a Return row moves the part still to earn by its own size, in the
  source and in the target ([ADR 0005](./0005-seeded-monte-carlo-seams.md)). It never overdraws.
- **A shortfall is reported, and is no Shortfall.** What a transfer could not move (the source held less, was
  locked, or the loan owed less) is `unmoved` on its breakdown line and nothing else: it never ends the run,
  never reaches the `withdraw` list and never leaves anything unfunded. The plan stated an amount the
  Accounts could not give; the page can say so.
- **Outside cashflow.** A transfer is no income, expense or Contribution. It is in no part of the net, never
  in Available cashflow, and net worth is the same before and after it. Because it only moves money, `interest`
  in the Annual roll-up is untouched.
- **Cost basis.** The source's pooled basis falls by the moved share, `basis × moved / value` rounded half up
  and never above the basis, as a sale takes it ([ADR 0008](./0008-levy-tally-sources-returns-and-gains.md)). That
  share is added to the target's basis when the target tracks one. A source with no `gainLabel` has no basis to
  give, and a gain-tracked target then starts at the amount moved; a target with none takes none, and the basis
  leaves with the money. Nothing is tracked without a Levy, as for a sale. With the default, no gain is
  tallied: the gain stays unrealised in the target and is tallied when the target is sold.
- **`realise`.** Off by default. In Thailand gains on listed shares and on mutual funds held by individuals
  are generally not taxed, and fund-to-fund rollovers are the common case; a plan that needs the gain tallied
  says `realise: true`. Then the source books a sale of the amount, the Realised gain `moved − basis taken`
  is tallied under its `gainLabel` as a sale's is ([ADR 0021](./0021-buy-and-sell-an-asset.md)), and a gain-tracked
  target starts at the amount moved, as a purchase would. The core states no tax: what a gain means is the
  caller's Levy.
- **Order on a date.** Planned amounts (all read before anything lands), the employer shares ([ADR 0026](./0026-employer-contribution.md)),
  payouts ([ADR 0027](./0027-account-payout.md)), planned withdrawals (loan draws and sales), debt payments, obligations, asset
  Contributions, and then the sign of the date's net decides. A net at or above zero lands the transfers
  first and then routes the surplus, so the surplus fills an Account a transfer emptied and a transfer does
  not race a Contribution into it. A net below zero draws the `withdraw` list first, and the transfers then
  move what is left, so a transfer never takes the money a bill needed. The fees ([ADR 0028](./0028-account-fee.md)),
  which read their Account first, are last either way. So a transfer sees a payout that has left, a sale that
  has sold and a Contribution that has landed. Several transfers on one date apply in Scenario order (the
  order the Flows are listed, not their ids), each reading the Accounts as the one before left them. A fixed
  amount is not clipped by the date's reads; a Derived amount read the source before anything landed, so it
  can plan more than is left and moves what is left.
- **A transfer never makes a Shortfall.** On a date with a bill the `withdraw` list can pay, the bill is
  paid first and the transfer moves what remains: cash 100,000 with `withdraw: ["cash"]`, an 80,000 bill and a
  fixed 50,000 transfer the same date pays the bill, moves 20,000 and reports 30,000 `unmoved`, and the run
  goes on. A Shortfall is only ever the bill the plan could not pay without any transfer.
- **A Derived read and `unmoved`.** "All of it" reads the source before anything lands, so `unmoved` counts
  what left the Account before the transfer (a same-day payout, sale or bill drawn through `withdraw`) as well
  as what it could not give: a page should not read `unmoved` as "could not move" for a Derived amount.
- **A Return series.** A transfer between two Accounts that follow a Return series, in the middle of a row,
  can settle one unit away from exact neutrality: the half-up commit at the transfer date happens in each
  Account, as for any change in the middle of a row ([ADR 0005](./0005-seeded-monte-carlo-seams.md)). Net worth on the date is unchanged.
- **Gifts.** A gift to someone outside the plan is an expense. A transfer is only between the plan's own
  Accounts.

### Reported

- **Annual roll-up.** `transfers`, the money moved, present only when the Scenario declares a transfer Flow
  (as `withdrawals` is). It is in no other figure.
- **Cash-flow breakdown ([ADR 0018](./0018-cash-flow-breakdown.md)).** `transfers`, one line per Flow in Scenario order: `{ flow, source,
  target, amount, unmoved }`, present only when the Scenario declares one, and listed only when it moved or
  could not move something. Outside money in and money out: the identity
  `Σincome + Σwithdrawals + Σdrawn + unmet = Σprepaid + Σsettlements + Σexpenses + Σcontributions.applied + Σsurplus`
  is unchanged, with the transfers on neither side, and holds on every parity fixture.
- **Liability statement ([ADR 0017](./0017-liability-statements.md)).** A liability a transfer targets lists `transferred` per month,
  a payment kept apart from `paid`: `opening + drawn + interest − paid − transferred = closing`. The key is
  present only for such a liability, so every other statement is as before. `paidOff` counts a transfer.
- **Estate statement ([ADR 0025](./0025-estate-statement.md)).** Not touched: it reads the Accounts' values. A transfer between two
  assets changes nothing in it; one that pays a liability takes the same amount off gross and off debts, so net is
  unchanged (a cost that is a share of gross follows gross).

### Financial Independence and chance of success

- Every candidate's walk and every Market path runs the engine's own `processDate`, so a transfer lands in
  each as in a projection and nothing about FI is recomputed. A transfer with a fixed amount is planned as any
  Flow; one that reads an Account is a Derived amount that reads an Account ([ADR 0020](./0020-derived-amounts-read-an-account.md)), priced from
  the candidate's own walk. Both Accounts of a transfer count as Accounts that can change on a future date, so
  a Scenario with a `next12Months` expense Metric and a Derived amount that reads either is
  `NEXT_12_MONTHS_READS_ACCOUNT`.
- A transfer into an Account that is locked, Illiquid or not on the `withdraw` list moves money out of the
  survival walk's reach, and FI moves later: 6,000,000 locked into an RMF until 2040 on 1 July 2027 moves a
  plan from 1 May 2028 to 1 Nov 2028 (six months of a 1,000,000 margin), and into a liquid fund that
  `withdraw` does not name to 1 Aug 2028 (the fund counts in Accessible net worth, but nothing draws it). Into a liquid
  fund `withdraw` names, it moves nothing. The brute force (`oracle-account-fi.ts`) agrees on every month.
- A Derived transfer that reads earned income stops with it, as any Derived amount does; it is no debt
  payment, so it is not refused the way a Derived debt payment is.

## Considered options

- **A transfer as a pair of a withdrawal and a Contribution.** Rejected: the cash of a withdrawal never counts
  toward Available cashflow and cannot fund a target Contribution, and an obligation Contribution is limited
  by cash, so there is no way to state it once, and the Cost basis would be realised on the way.
- **Realise by default.** Rejected: see `realise`. The cost is a flag a plan that needs the gain sets.
- **Transfers before routing, always.** Rejected: a transfer could then empty an Account the `withdraw` list
  needed for the date's bill and turn a bill the plan can pay into a Shortfall, against the rule that a
  transfer is never a Shortfall. It is kept only for a net at or above zero, where there is no Shortfall to
  turn and the surplus can refill the emptied source. Transfers after routing for every net was also
  rejected: a surplus would then land in an Account the transfer was about to empty.
- **A Shortfall when the source holds less.** Rejected: a transfer asked for more than there is is a plan the
  Accounts did not follow, not an unmet need. `unmoved` says so without ending the run.
- **Id order for same-date transfers.** Rejected: ids are names, and a plan reads its Flows in the order it lists them.
- **Transfers into a liability as a Contribution.** Rejected: a debt payment is an obligation funded by cash,
  and the point is to pay it from an Account without touching cash. Its own statement line keeps the two apart.

## Consequences

- New codes in `ERROR_CODES`: `TRANSFER_FROM_ILLIQUID`, `TRANSFER_FROM_LIABILITY` and `TRANSFER_SAME_ACCOUNT`,
  worded in the CLI's `refusal-transfer.ts`. Until the CLI publishes the shape, it refuses a `transfer` Flow
  with "ships in a later release" (`routing-unshipped.ts`), so it never stores an unpublished shape.
- Five cases join `parity/cases.json`: `transfer-rollover-month`, `transfer-shares-month`, `transfer-loan-month`,
  `transfer-short-month` and `transfer-locked-fi`. No existing case changes.
- Hand-worked tests: `engine/transfer.test.ts` (a whole fund into a locked RMF; a yearly tenth of 1,000,000 as
  100,000, 90,000 and 81,000; a 250,000 loan paid 100,000 a month ending at 50,000 with 350,000 unmoved;
  a source of 40,000 asked for 100,000 moves 40,000; a locked source), `engine/transfer-order.test.ts` (the
  order on a date against contributions, surplus, the `withdraw` list and an employer share),
  `engine/transfer-accounts.test.ts` (payout, sale, fee and a Return series), `engine/transfer-basis.test.ts`
  (a quarter of 1,000,000 on a basis of 600,000 moves 150,000 of it; realised, 100,000 of gain at once; the
  half-up tie), `check/transfer.test.ts` (each refusal), `estate/transfer.test.ts` and
  `chance/transfer-chance.test.ts`. `golden/oracle-transfer.ts` is the independent day-by-day oracle (it
  imports nothing from the engine) that `golden/transfer-oracle.test.ts` and `golden/transfer-fi.test.ts` hold.
