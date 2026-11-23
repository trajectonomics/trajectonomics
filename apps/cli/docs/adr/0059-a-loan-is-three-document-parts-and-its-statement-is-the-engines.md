# A loan is three parts a document already names, and `projection run --liabilities` prints the engine's statement of each

Status: accepted. Ships in 0.8.0 (`projection run --liabilities`).

A person with a car loan writes it in a Scenario document, finds its shape in `traj schema`, and reads its
schedule from a Projection. The loan's arithmetic belongs to the engine (sim ADR-0016 and ADR-0017), so the
CLI adds no loan model and computes no figure of a loan. This ADR records the document form a loan takes,
and the one flag that prints the engine's statement of each loan.

## Decision

- **A loan is three parts.** A liability Account with a nominal `rate` and a `compounding` period; a
  `withdrawal` Flow whose `source` is that liability, which borrows the money when it lands; and a
  Contribution whose `target` is the liability and whose amount is a `level` payment (sim ADR-0016). An
  early payoff is one more Contribution into the same liability. The CLI names none of these as a loan.
- **The worked example teaches the form.** `traj schema scenario apply` publishes one loan in its example
  (`car`, a withdrawal `car-loan` and a level payment `car-pay`), so the example passes `scenario apply` and
  `--decimal` round-trips it unchanged. `level.principal` is a money field, so the decimal form converts it.
- **Opt-in through `--liabilities`.** `projection run --liabilities` passes `liabilityStatements: true` to
  the engine and adds two tables (cli ADR-0027), present only with the flag:
  - `liabilities`: one row per liability and calendar month, in Scenario order then date order, with
    `opening`, `drawn`, `paid`, `interest`, `closing` and `partial`, as decimal strings at the Currency's
    scale, each the engine's own figure;
  - `paidOff`: one row per liability, `date` null when it is not paid off by the end.
- **The human form prints the statement, read from the rows.** One line per loan, "car: paid off on 2026-12-01"
  or "<account>: owes <amount> at <date>" for a loan the Projection ends with, then the month table. Neither line states a figure the rows lack.
- **Declared withdrawals.** An annual row carries `withdrawals` only when the engine states it, which is only
  when the Scenario declares a withdrawal Flow (sim ADR-0016). The human table shows that column only when some
  row states it (`ColumnHint.optional`), so a Scenario without a withdrawal Flow keeps its bytes.

## Considered options

- **A `loan` kind in the document.** Rejected: the Scenario model is `sim`'s (cli ADR-0024), and a second loan
  model in the CLI would be a competing one. Three existing parts express the loan, and the engine checks them.
- **Totals of a loan in the CLI.** Rejected: a total the engine does not give would be a figure the CLI
  computed. The statement's identity (`opening + drawn − paid + interest = closing`) holds in the engine's
  own rows, and the tests check it on each month rather than against a second computation.
- **The statement in the default output.** Rejected: it would change every Projection that has a liability,
  and the goldens with them. The flag keeps the bytes of a run that does not ask for it.

## Consequences

- A loan's `paidOff` date is the first Landed date the amount owed reaches zero, so a mid-month payoff is
  dated to its day, while the month row reads its closing at the month's end (sim ADR-0017).
- The flat-rate instalment loan and the daily-interest loan are not covered (#279). A Scenario that needs them
  is refused or modelled as the three parts above.
- Asset statements are a later slice: `--liabilities` reports liability accounts only.
