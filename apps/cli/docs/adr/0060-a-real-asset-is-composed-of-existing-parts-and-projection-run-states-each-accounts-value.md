# A real asset is composed of existing parts, and `projection run --accounts` states each Account's value

Status: accepted. Ships in 0.8.0 (`projection run --accounts`).

A person, an agent and the Dashboard can now buy, hold, finance and sell a home or a car, because the engine
reads an Account's value in a Derived amount (sim ADR 0020), buys with an obligation Contribution and sells
with a withdrawal from an asset (sim ADR 0021), and marks an asset illiquid (sim ADR 0019). They need two
things from `traj`: how those parts fit, and the asset's value year by year. `projection run` reports net
worth per row, never one Account's value.

## Decision

- **A real asset is composed, not modelled.** The Scenario model is the core's (cli ADR-0024), so the CLI
  adds no `asset` kind and no key of its own. A real asset is:
  - an asset Account with a stated `rate` and `liquid: false`, named by no routing list (an obligation's
    target may not be in `cashflow.withdraw`, sim ADR 0021);
  - a `<asset>-purchase` Contribution into it with `funding: "obligation"`, paid in full on its date;
  - optionally a loan, the three parts of cli ADR-0059: a liability, a `withdrawal` that borrows on the
    purchase date and a `level` payment, named `<asset>-loan` (liability), `-loan-draw` and `-loan-payment`;
  - Flows that read its value: `<asset>-running`, an expense whose Derived amount scales `account(<asset>)`
    by a share the caller states, and `<asset>-rent`, an income Flow;
  - `<asset>-sale`, a `withdrawal` from the asset whose Derived amount reads `account(<asset>)`, which sells
    all of it at its value. The running Flow and the rent end before the sale date, because the engine
    reads the value on each date and a sold asset is worth nothing.
- **The ids are a convention, not a rule.** `<asset>-purchase`, `-running`, `-rent`, `-sale` and `-loan` are
  what the Dashboard writes and reads to recognise a real asset in a document. The core never sees them and
  `check()` does not require them; a document with other ids is valid and projects the same.
- **The worked example teaches it.** `traj schema scenario apply` publishes one home in its example
  (`home`, `home-loan` and the six Flows), so the example passes `scenario apply` and `--decimal` round-trips
  it. Every rate, share, price and date in it is an example value; `traj` ships no default for any of them,
  and the schema text says so. The example states no Tally label: whether the rent or the gain of a sale is
  taxed under a Levy is the caller's choice.
- **`--accounts` states each Account's value.** `projection run --accounts` adds a `balances` table (cli
  ADR-0027), present only with the flag: one row per date and Account, `{ date, account, amount, real }`,
  money as decimal strings. The dates are the row at each roll-up's end (the one `realNetWorth` reads, so the
  two share a date), or every monthly row with `--monthly`. The Accounts are in the Scenario's order, not the
  engine's, which lists a row's balances by id. `amount` and `real` are the engine's `balances` and
  `realBalances`; a liability's amount is what is owed, positive. Nothing is computed by the CLI, and the
  engine is unchanged.
- **The human form prints Accounts by year.** Only with the flag, one table after the body: a row per
  roll-up's end and a column per Account, nominal amounts, read from the balance rows. The long table is JSON's.
- **Without the flag every output is byte for byte what it was.**

## Considered options

- **An `asset` kind, or a `realAsset` block in the document.** Rejected: a second model beside the core's,
  which the engine would not check. The existing parts express it, and `check()` validates every one.
- **Each Account's value in `monthly` and `annual` rows.** Rejected: it changes every Projection and every
  golden, and one column per Account makes the row's shape depend on the Scenario. A table keyed by Account
  keeps the shape fixed and the flag keeps the bytes.
- **Engine order for the Accounts.** Rejected: it is by id, so a person reading a plan would see their Accounts
  shuffled. The Scenario's order is the one the document and `traj schema` use.

## Consequences

- A sale does not repay the loan: the level payments go on as the schedule says, and the sale's cash goes to
  cashflow. An early payoff is one more Contribution into the liability (cli ADR-0059).
- On the purchase date the obligation is subtracted before Available cashflow (sim ADR 0021), so a target
  Contribution due that day (the example's monthly `invest`) may be reported unfunded that month.
- A plan whose purchase the `cashflow.withdraw` list cannot pay is a Shortfall on that date, as for any expense.
- The Dashboard's per-asset value is a read of this table, which the web contract accepts in the same change.
