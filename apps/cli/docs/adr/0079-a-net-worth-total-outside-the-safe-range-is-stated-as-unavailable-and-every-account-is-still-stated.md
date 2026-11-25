# A net worth total outside the safe range is stated as unavailable, and every account is still stated

Status: accepted.

Every Balance a Ledger holds is a safe integer of satang, and `balance` and `report networth` also state one figure that is not a Balance: net
worth, the sum of the asset and liability Balances per currency. Each Balance can be in range while that sum is not. A Loan at `90071992547402.70`
and a Fund overdrawn by `9.58` hold two in-range Balances and a sum of `-90071992547412.28`, past the 90071992547409.91 a figure can state. The engine refuses the
sum (`AMOUNT_OVERFLOW` at `netWorth.totals[…]`), and `traj balance` then failed with exit 3 and printed no account, though `account value` and `tx add`
had written every Balance without a word (#523).

## Decision

- **The total is stated as unavailable; the accounts are still stated.** A total is a read-side sum over Balances the Ledger already holds, so it is refused
  where it is read. `balance` and `report networth` (one date, and each month of `--monthly`) state every row, and in place of the total they state `null` and the refusal that
  would have been the call's own: `netWorth: null, netWorthError: {...}` in `balance`, `totals: null, totalsError: {...}` in `report networth`. The error is the fields of
  the error envelope (`code` `AMOUNT_OVERFLOW`, `exitCode` 3, `message`, `path` `netWorth[THB]` or `totals[THB]`, `details`), as ADR-0077 states a refused month. The call exits 0, because every account was read.
- **A total inside the range is byte for byte what it was.** `totals` and `netWorth` are the same arrays, and the error key is absent, not `null`: the goldens do not change.
  The output schema gains one nullable type and one optional key, and `traj schema balance` and `traj schema report networth` say so.
- **An account's own overflow is still the call's refusal.** A Leaf Balance outside the range is refused at its row (ADR-0058, the per-date rule of `account value`), and an overflow of a
  non-counted Leaf (income, expense, equity) still blocks `report networth`'s bottom line at `totals`, as before. Only the net worth sum across accounts is stated as unavailable here: a write
  cannot be refused for it without refusing a valid Ledger. The two other cross-account sums, `trialBalance.totals` (`balance --trial-balance`) and
  `profitAndLoss.totals` (`report pnl`), took the same treatment afterwards (see the addendum).
- **Human output prints a sentence in place of the total's line:** `not stated: every account is in range, but their sum exceeds the safe integer range; each account's balance above is stated`. The refusal's fields stay in JSON.
- **The rows come from the engine's `balances`, filtered by account type.** The engine's `netWorth` throws before it returns the rows it had assembled, so for a refused total the CLI reads `balances` at that date
  and keeps the asset and liability Leaf rows, in `account list` order. It states no figure of its own (ADR-0058): each row is the engine's Balance, and the filter is the type the column already prints.
  `balances` refuses only a Leaf `netWorth` would have refused first, so this read cannot fail where `netWorth` did not. A refused date in `--monthly` reads `balances` once for itself, which is a rare path.

## Considered options

- **Refuse the writes whose total would leave the range (`account value`, `tx add`, `tx import`).** Rejected. A total is a function of the whole Ledger at a date, and a write
  that does not touch it can still push it out (a Fund overdrawn on one date, a Loan on another), so the write would have to check every currency at every later date
  and refuse a Ledger that is valid account by account. The person who owns it would then be unable to record a true Balance, and a Ledger already holding such a state, from before the rule, would still need the read-side answer.
- **An empty `totals` array.** Rejected: `[]` already states a Ledger with no account, and the two must not read alike.
- **Exit 3 with the rows in `details`.** Rejected: the rows are the answer, the Dashboard reads `rows` and the call did read them; failing the call would blank them as before.
- **Add the unavailable state to the engine's `NetWorth`.** Deferred: it is a change to a published core contract for a read the CLI can answer with an existing query, and it can follow if a second caller needs it.

## Consequences

- `traj balance` and `traj report networth` exit 0 on the repro and print each account. The Dashboard reads `null` as no total and says why (web contract `netWorth`, `balance`).
- A consumer that read `totals[0]` or `netWorth[0]` without a check must handle `null`.
- `report networth --monthly` states the refusal per month in `totalsError`, and keeps `{ asOf, error }` for a month the Ledger refuses outright (an account's own overflow). A refusal of the scan itself (a duplicated Transaction id) is the call's own error once,
  before any month, as `--as-of` gives it (ADR-0077).

## Addendum: the trial balance and the P&L totals (2026-11-25, #539)

The Dashboard's balance read always passes `--trial-balance`, so on the repro Ledger (a Loan at `90071992547402.70` and a Fund overdrawn to `-9.58`) that read still failed with exit 3 on
`trialBalance.totals[THB].debit` while the Net worth page worked, and `report pnl` failed on `profitAndLoss.totals[THB]`. Both sums are of in-range rows, as net worth is, and both take this ADR's rule:

- **`balance --trial-balance`** states `trialBalance: { rows, totals: null, totalsError }` when a column's sum leaves the range. `totalsError` is the error envelope (`code` `AMOUNT_OVERFLOW`, `exitCode` 3,
  `path` `trialBalance.totals[THB].debit`, `message`, `details`) and the call exits 0. The top-level `netWorth` is stated or `null` on its own: the two sums are independent.
- **`report pnl`** states `totals: null, totalsError` with `path` `totals[THB]`, and every row.
- **A total inside the range is byte for byte what it was,** the error key absent. `traj schema balance` and `traj schema report pnl` gain the nullable `totals` and the optional `totalsError`.
- **Human output** prints the sentence of this ADR in place of the totals' line: `each account's balance above is stated` for the trial balance (as for net worth) and `each account's amount above is stated` for the P&L.
  The sentence is rewritten where the total stands: the top of the result, the `trialBalance` record, and each month of `report networth --monthly`, which printed `totals: null` and the whole `totalsError` block for a refused month before.
- **The rows come from the engine, apart from its totals.** Unlike net worth, no existing query gives the trial balance's or the P&L's rows without summing them: `balances` has no column split, no period and no Dimension filter. The ledger
  core therefore exports `trialBalanceRows` and `profitAndLossRows` (ledger ADR 0010), the row half of each query, and the CLI states those. A row outside the range is still the call's refusal, at its row.
- **`doctor --as-of` still refuses** an overflowing trial balance: it compares the two columns, and a total it cannot state is not one it can compare. Its refusal is `AMOUNT_OVERFLOW`, as before.
- **Code layout.** `report/total.ts` holds the read (`totalRead`, `netWorthRead`, `countedRows`); `report/total-view.ts` holds what the refusal looks like (`totalRefusal`, `totalSentence`, `totalDisplay`).
