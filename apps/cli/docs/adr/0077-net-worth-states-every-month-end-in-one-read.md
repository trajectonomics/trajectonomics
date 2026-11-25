# `report networth --monthly` states net worth at every month-end in one read

Status: accepted.

The Dashboard's Net worth history charts up to 120 month-ends (web ADR 0027). It read each one with its own `traj report networth --as-of`, so
a ledger that filled the cap spent about 19 s on every Edit, against 6.7 s for a 24-month ledger: each spawn opens the data directory and
rereads the whole ledger to state one date (#514).

## Decision

- **`traj report networth --monthly --until DATE [--since DATE]` is a second form of the same leaf**, as `account value --file` is a second form of
  `account value` (ADR-0020's idea of forms, ADR-0072). It states net worth at each month-end that is on or after `--since` and on or before
  `--until`, oldest first, from one read of the ledger. `--since` and `--until` are the range flags of ADR-0022, inclusive; `--from` and `--to` stay
  accounts.
- **`--until` is required and nothing is read from the clock** (ADR-0029). `--since` may be left out, and then the range starts at the month of the
  ledger's first Transaction, the one date the data supplies, as the absent `--since` of `report pnl` starts at the ledger's beginning. A ledger with no Transaction states no month
  and carries the store's `hint` (ADR-0040). A `--since` after `--until` is `INVALID_PERIOD` at `since`, a bad date is `INVALID_DATE` at its field.
- **The forms are checked in `run`, not in a refine**, so `--as-of` is no longer a required flag of the schema: `traj schema report networth` lists no
  `required`, and its output is the single-date result or the monthly one (`anyOf`). Without `--monthly`, `--as-of` is still required and
  answers with the same envelope as before; `--since` and `--until` without `--monthly`, `--as-of` with it, and `--monthly` with no `--until` are `invalid_input`
  at the flag.
- **Each month is exactly what `--as-of` states for that date.** The result is `{ since, until, months }`, and a month is the single-date result with its own
  `firstTransactionDate`, `noTransactionsBefore`, rows, totals and `hint`. Nothing is computed twice or differently: the ledger core's `netWorthHistory` scans the
  ledger once and answers `at(asOf)` with what `netWorth` answers, errors included, and the CLI assembles each month with the code `--as-of` uses.
  `report-networth-monthly.test.ts` compares the 120 month-ends of a ten-year ledger with 120 single-date reads, and the core tests compare `at` with `netWorth`, its refusals too.
- **A month the ledger refuses is that refusal, in place.** The single read of an overflowing date exits 3 with `AMOUNT_OVERFLOW`; the monthly read states the same
  `error` body (`code`, `exitCode`, `message`, `path`, `hint`, `details`) as `{ asOf, error }` for that date and states the others, because a range is not one
  question: the Dashboard charts the months that can be stated and says which cannot (web ADR 0027), as it did when each was a call of its own. The
  call itself exits 0. A refusal that has no date to attach to (a corrupt database, a locked one) is still the call's own error.

## Considered options

- **A leaf of its own (`report networth-monthly`).** Rejected: the second form is the same question asked at many dates, and a second leaf would be a second name for
  the figures that the first states. The cost is the loosened schema above, which is the cost `account value` already pays.
- **`--monthly` without `--since`/`--until`, a count (`--months 120`).** Rejected: a count needs an end, and the end is a date the caller states. The
  Dashboard already holds the dates (web `monthEndsBetween`) and passes the first as `--since` and the As-of as `--until`.
- **Failing the whole call on the first refused month.** Rejected: one overflowing month would blank a ten-year chart, and the Snapshot's history would no longer
  be what the 120 calls gave.
- **120 in-process `netWorth` calls.** Measured and rejected: the cost of one date is almost all the scan (every Transaction is rechecked against the chart), so 20,000 Transactions at 120
  dates took 13.7 s in one process and 1.4 s with one scan.

## Consequences

- The Dashboard's history is one spawn. Its Snapshot still holds one Read per month, each naming the single-date argv that states the same figures (web ADR 0027).
- A reader of the older `report networth` output is unaffected: the single-date result is unchanged, byte for byte.
- A month-end is the last day of the calendar month, Gregorian, inside the supported years (1900-2100), computed by `src/report/month-ends.ts` from dates the CLI has already checked. It states a date, not a figure, so
  it adds no arithmetic beyond the engine's (ADR-0058).
