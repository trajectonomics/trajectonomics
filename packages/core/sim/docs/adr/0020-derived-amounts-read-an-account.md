# Derived amounts can read an Account's value: running costs and sales as a share of what an asset is worth

Status: accepted

A home's upkeep and insurance are often a share of what the home is worth, and that value moves each
year by the Account's rate. A Derived amount could read only Flows, constants and other Measures, so
"1% of the home's value a year" could not be written: the caller would have to pre-compute a schedule
from a Projection it had not run. A sale of a whole asset needs the same read. This ADR adds an
`account` Measure to a Derived amount's graph, and fixes the date on which the value is read.

## Decision

- **The Measure.** `{ id, op: "account", account }` yields the value of that Account on the Landed
  date: the valuation the Milestone metrics use (ADR 0012, `src/engine/value.ts`), with growth accrued
  to the date and Accrued interest included. A liability reads the positive amount owed.
- **When it is read.** On each Occurrence, the planned amounts are evaluated first, before anything
  lands: before the day's Flows, planned withdrawals, debt payments, asset contributions and Settlements,
  and after the Milestone gate, which changes no balance. Two Flows that read one Account on one date
  therefore read the same value, whatever their order in the Scenario, and a Flow that lands on that
  date does not change what another Flow reads on it. `src/engine/planned-on.ts` reads each Account
  from the run's own states; the value is an exact BigInt from the valuation, with no float.
- **Rounding.** The value is an integer in minor units. Only the `scale` or `mul` a caller writes
  rounds the result, with the caller's `rounding`. A negative result is `NEGATIVE_AMOUNT` and an
  overflow is `VALUE_OVERFLOW` at the date: nothing is clamped.
- **No default share.** No rate, share or percentage exists in code, examples or the CLI. "1% a year,
  read monthly" is `scale(account, num: 100, den: 120000, rounding)`, every number in the caller's graph.
- **Levies refuse it.** A Levy's Measure graph reads tallies, not balances: an `account` there is
  `ACCOUNT_MEASURE_IN_LEVY` at the Measure's own path.
- **`check()`.** An `account` read of an Account the Scenario does not declare is `UNKNOWN_ACCOUNT` at
  the Measure's `account` key. A cycle through a Flow that changes the Account it reads is `FLOW_CYCLE`:
  a Flow that reads Account A has an edge to every Flow that changes A (a contribution's `target`, a
  withdrawal's `source`), so a Flow that contributes to the Account it reads, a self-reference through
  the Account, is a cycle of one. A cycle through two Flows is found the same way. A read of an Account
  that another Flow changes, with no way back, is accepted.
- **Locked and illiquid Accounts** are read at their full value (ADR 0019 only moves Accessible net
  worth and the measures built on it).

### Financial Independence

- **Candidate walks** read the Account values of their own walk, exactly, through the same engine path
  as any run. Stopping earned income can therefore move a read, and the FI scan sees it.
- **Planned windows** (the Minimum buffer, the rule-of-thumb reference on its planned and trailing
  bases, and a Milestone's `next12Months` Metric) plan an account-reading expense from the Account values
  of the **unchanged plan**: an ungated run of the Scenario through the window's last date. The value is
  read on the Landed date, from that run's states before the date's Flows, as a walk reads it. The run is
  made lazily, only when a window evaluates an account read, and once per window source.
- **Stated limitations.**
  - In the unchanged-plan run every Flow gate is off, static or dynamic (`startAt`, `endAt`), and a static
    `once` Flow is still moved to its fire date as `buildEvents` moves it. A Flow gated by a Milestone can
    therefore change an Account in the run that a window reads, where the candidate's own walk would not.
  - A planned window does not move with a candidate's own walk. For a candidate that changes the flows of
    the Account it reads, the window still prices the expense from the unchanged plan, so a buffer or
    reference can differ from a walk built with the candidate's own values.
  - The FI planned windows use the deterministic plan, with no Return series. A `chanceOfSuccess` path's
    gated run reads its own path's returns in its Milestone `next12Months` Metric.
- **Trailing Milestone expenses** (`trailing12Months`) of a gated run read what that run itself landed, so
  they are exact; the FI trailing basis of the reference reads the unchanged plan, as the planned basis does.
- A Scenario with no account read makes no extra run and keeps every number it had.

## Considered options

- **Refuse an account-reading expense in the FI test, as `DERIVED_EXPENSE_READS_EARNED` does.** Rejected.
  That refusal exists because earned income stops at the FI month, which the walk always changes. An
  Account is changed only by the Flows that name it, so a home that no Flow funds is valued the same in
  every walk, and the reference can plan it. Refusing it would block the issue's own case.
- **Plan planned windows from each candidate's walk.** Rejected for now: the windows are memoised per set
  of fire dates, and a per-candidate table of every Account's value on every window date would cost a
  full walk per candidate. The stated limitation above is the cost of keeping one window per fire set.
- **A balance read at the end of the previous Occurrence.** Rejected: it would miss the growth accrued
  to the Landed date and would need a second rounding, so it would not be the valuation a Milestone uses.

## Consequences

- Existing parity hashes are unchanged: `parity/cases.json` gains no cases, because no existing Scenario
  reads an Account. The op is new, so no recorded projection moves.
- The hand-computed tests are `src/engine/derive-account.test.ts` (a home of 5,000,000.00 at 3%, read on
  2026-01-01 as 416,667 and on 2027-01-01 as 429,167; a depreciating home at -3% as 404,167; two Flows
  on one date; a liability; a locked and an illiquid home; an overflow), `src/engine/account-values.test.ts`
  (the unchanged-plan values at the start, after one year and past the horizon), `src/check/derive-account.test.ts`
  (the refusals and cycles at their paths) and `src/fi/derive-account-window.test.ts` (the reference
  window's planned upkeep).
- `src/golden/oracle-account.ts` values an untouched Account by counting anniversaries of the start, where
  Actual/365 No Leap makes the growth one exact power. `src/golden/derive-account-golden.test.ts` checks the
  engine's cash against that oracle at each January. The oracle covers anniversaries only; other dates
  rely on the engine's day factor, which the growth tests already check.
- The CLI publishes the `account` op in a Flow's `derive` graph (`apps/cli/src/scenario/shape/flow-parts.ts`),
  and `ACCOUNT_MEASURE_IN_LEVY` is filed as a document refusal in `refusal-elsewhere.ts`.
