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
  bases) plan an account-reading expense from the **candidate's own walk**, as ADR 0012 and #225 build
  each candidate's windows from its own fire dates. A Scenario with any `account` read has no shared
  window (`WindowPlan.shared` is `undefined`, as with a dynamic Milestone), and no window is cached,
  since a window now depends on values as well as fire dates.
  - Before each date's Flows land, a walk records the value of every Account a Derived amount reads
    (`src/engine/account-values.ts`), on each date a window reads. A window prices the **original**
    plan's events (`fi/original-window.ts`), which still include the earned income the candidate
    stopped, so those dates are read although the candidate lands nothing there: `WindowPlan.readDates`
    holds each date the original plan has a Derived event on, through the windows' last date, and a
    walk records on it as well as on every date its own landing plans a Derived amount (the Flows a
    Milestone's gate lets land, a deferred `once` Flow on its fire date). A date the walk does not stand
    on, because the candidate lands nothing there, is recorded between the dates it does stand on
    (`fi/read-dates.ts`), from the states as they stand, which only growth has moved. Any other date is
    never read, and records nothing. The shared prefix records them for the unchanged walk, and a
    candidate's walk records them from its own month on; a date before the candidate's month reads the
    prefix, which is the candidate's own history. A row is the value on its own date, not grown to the
    date asked for, so a read of a date with no row on or before it is an internal error and throws.
  - The walk then continues its own events through the windows' last date, a year past the horizon
    (`src/fi/walk-tail.ts`), on copies of its states and Levy tallies, with the buffer check off and no
    dynamic Milestone fired: a Milestone unfired at the horizon stays unfired, as ADR 0012 says. The
    next-12-months window is thus priced from the states the candidate's own plan reaches, including
    the Flows it stopped (a home no longer bought from a stopped salary, a Contribution gated by a
    Milestone that fires later in the candidate's walk).
  - `finish()` builds the windows from those recorded values. The pre-candidate (original) source takes
    the values as an argument and runs nothing of its own.
  - The brute force is `src/golden/oracle-account-fi.ts`: for each candidate month it walks the Scenario
    afresh with earned income stopped, reading the buffer and the reference from that walk's landings
    through the horizon plus twelve months. Three plans (an account read whose Account a stopped
    salary funds, a home bought from the salary, a home bought when a Milestone fires) agree with it.
- **Stated limitations.**
  - With a Return series (`chanceOfSuccess`) the window reads the read Account along the path's own
    future rows, as the engine's walk does. A series ends at the horizon, so an Account that holds one
    stays at its value of that date through the year past it. The deterministic scan has no such gap.
  - A Levy Settlement in the year past the horizon is settled only if the Levy's own periods reach it.
  - A walk that has a Shortfall or a problem in that year stops there, and the later dates read the
    states **that continued walk** ended with, grown to the date: the tail's own, not the horizon's
    (in `golden/derive-account-tail.test.ts`, the candidate that stops the salary on 2026-04-01 survives
    the horizon of 2031-01-01 and runs out in May 2031, so it has already spent what the horizon's
    states still held, and reading them priced a fee that would never be paid). A date the walk skipped reads the row at or
    before it, never a later balance. The oracle prices the same dates the same way: it stops landing at
    the Shortfall but keeps planning every later date's amounts from the states it ended with
    (`oracle-account-walk.ts`).
  - A retirement-spending scan keeps its fixed window; its trailing reference still reads the
    candidate's own walk before its month.
- **Milestones.** A `next12Months` expense Metric plans the Flows over a year the run has not walked,
  and an account-reading amount in it needs each Account's value on dates ahead. The value of an
  Account that **nothing changes** is known without a walk: it is the Account's state as it stands,
  grown to the date (`readerAhead` in `src/engine/account-values.ts`, on a copy, so a nominal Account
  keeps its own date). An Account that **can change on a future date** needs a forward walk of the
  engine from each evaluation date, in every FI candidate's walk, so `check()` refuses that:
  `NEXT_12_MONTHS_READS_ACCOUNT`, at the Metric's `expenses` key (the `metric` or the `base` of a
  criterion). The line, in `src/check/expense-window-reads.ts`:
  - **Refused**: a Flow's `derive` reads an Account that a Flow pays into or out of (a Contribution's
    `target`, which covers a debt payment and an obligation purchase; a withdrawal's `source`, which
    covers a sale and a loan draw), or that `cashflow.surplus`, `contribute` or `withdraw` names.
  - **Accepted**: every other read. Only its opening state and its rate move that Account.
  - The worked case: a home already owned, never sold, read only by its upkeep (1% of its value, say)
    beside "investments at least 25 times the next 12 months of spending" is **accepted**. A home with
    a purchase (`<home>-purchase`) or a sale (`<home>-sale`) in the plan is **refused**, whatever the
    date of either, since the window cannot know the value on a date after the Flow lands. Narrowing
    the refusal to "gated or earned-income-fed" Accounts would not be sound: an ungated Contribution
    can go unfunded, and withdrawals depend on the whole cash path.
  - A `trailing12Months` Metric reads what the run itself landed, so it is accepted whatever it reads.
  - `src/check/expense-window-reads.test.ts` holds both sides, and `src/milestone/account-window.test.ts`
    the figures: a home of 500,000,000 at 3% under an annual 1% upkeep gives windows of 6,200,000 (the
    2026-01-01 upkeep of 5,000,000 plus twelve livings of 100,000), 6,350,000 (the 2027 upkeep of
    5,150,000), 6,504,500 (2028) and 6,663,635 (2029), and the Milestone fires on the first date
    whose window reaches the amount.

  The earlier plan, an ungated run of the Scenario through the window's last date, gave a wrong
  answer: a home bought only after a Milestone was priced from the start, so `{expenses: next12Months}
  atMost 2,000,000` never fired when it should have on 1 Jan 2026.
- A Scenario with no account read makes no extra walk, no recording and keeps every number it had.

## Considered options

- **Refuse an account-reading expense in the FI test, as `DERIVED_EXPENSE_READS_EARNED` does.** Rejected.
  That refusal exists because earned income stops at the FI month, which the walk always changes. An
  Account is changed only by the Flows that name it, so a home that no Flow funds is valued the same in
  every walk, and the reference can plan it. Refusing it would block the issue's own case.
- **Price the windows from an ungated run of the unchanged plan.** Tried first and rejected: a stopped
  salary no longer funds the Account (so its upkeep is dearer in the unchanged plan), and a Milestone-gated
  purchase lands early in an ungated run. On a 30-year plan it gave an FI month of 1 Dec 2028 where the candidate's own walk gives 1 Nov 2027.
- **Forecast a Milestone's next 12 months for an Account that can change.** Rejected for now (see
  Milestones above): one forward engine walk per evaluation date, in every candidate walk. An Account
  nothing changes needs none.
- **A balance read at the end of the previous Occurrence.** Rejected: it would miss the growth accrued
  to the Landed date and would need a second rounding, so it would not be the valuation a Milestone uses.

## Consequences

- Existing parity hashes are unchanged: `parity/cases.json` gains no cases, because no existing Scenario
  reads an Account. The op is new, so no recorded projection moves.
- The hand-computed tests are `src/engine/derive-account.test.ts` (a home of 5,000,000.00 at 3%, read on
  2026-01-01 as 416,667 and on 2027-01-01 as 429,167; a depreciating home at -3% as 404,167; two Flows
  on one date, and a Contribution to the home on the read date, in every order; a liability; a locked and
  an illiquid home; an overflow), `src/engine/account-values.test.ts` (the recorded values),
  `src/check/derive-account.test.ts` (the refusals and cycles at their paths, the Levy refusal through
  `check()` and the `next12Months` refusal), `src/check/expense-window-reads.test.ts` (both sides of
  the `next12Months` line) and `src/fi/derive-account-window.test.ts` (the window prices
  from the values it is given).
- `src/golden/oracle-account.ts` values an untouched Account by counting anniversaries of the start, where
  Actual/365 No Leap makes the growth one exact power; `src/golden/derive-account-golden.test.ts` checks the
  engine's cash against it. `src/golden/oracle-account-walk.ts` is the day-by-day walk (Accounts that
  change, Contributions, Milestones) that `oracle-account-fi.ts` re-runs per candidate, and
  `src/golden/derive-account-read-dates.test.ts` (a bonus that only the original plan lands: a
  window that prices it on 2026-06-15 reads inv there, and FI is 2026-01-01 with 1,800,000 for a buffer
  of 0 and of 3 months; the shape it failed with was `NEGATIVE_AMOUNT` at that date),
  `src/milestone/account-window-year.test.ts` (a window from each 1 January of 2026 to 2032 equals the
  engine's annual expense for that year to the unit, across the 2028 leap day, for an effective, a
  nominal-monthly and a liability Account under a weekly, monthly or annual upkeep from 31 January),
  `src/golden/derive-account-tail.test.ts` (a candidate that runs out in the year past the horizon: FI
  on 2026-04-01 with a reference of 2,587,636, which the engine now agrees on with the oracle, where
  the horizon's states gave 2026-05-01), and `src/golden/derive-account-fi.test.ts` holds the plans: 3,021,879 against the unchanged plan's 3,139,092;
  FI on 1 May 2026 against 1 Jun, and 1 Feb against 1 Mar, with a home bought from the salary; 1,800,000
  against 1,816,745 with a home bought when a Milestone fires.
- **Cost.** On a 30-year monthly plan with one account read the FI scan takes about 140 ms against about
  95 ms for the same plan with a fixed amount (the cost of main), a recording per date, a copy of the
  states per candidate and one window per candidate. A walk now records only on the dates a window reads,
  so a sparse read gets cheaper and a monthly one does not: at a 60-year horizon with a yearly upkeep
  (a 500,000,000 home at 3%, 0.2% of its value a year, survival FI with no buffer, FI on 2037-12-01) the
  scan's median over nine runs went from about 800 ms on main to about 460 ms, and with a monthly
  upkeep it stayed at about 1,190 ms (main 1,187 ms), because every date is a read date. Before the
  fix to the read dates the same yearly plan measured about 380 ms; the dates the original plan reads
  and the candidate does not land cost the difference, within the noise of a loaded machine. The rest of
  the gap to a fixed amount (about 220 ms) is that the read plan reaches FI later, so its scan walks
  more candidates, and that each date's valuation of the read Account is computed once by the engine
  and once by the recording.
- The CLI publishes the `account` op in a Flow's `derive` graph (`apps/cli/src/scenario/shape/flow-parts.ts`),
  and `ACCOUNT_MEASURE_IN_LEVY` and `NEXT_12_MONTHS_READS_ACCOUNT` are filed as document refusals in
  `refusal-elsewhere.ts`. The op's description says accrued interest is included.
