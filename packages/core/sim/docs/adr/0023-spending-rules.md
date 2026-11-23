# Spending rules: an expense whose yearly amount follows the portfolio

Status: accepted

In retirement most people spend by a rule tied to what their savings are worth: a share of the
portfolio at retirement kept level in real terms, a share of what it is worth each year, or a share cut
after bad years and raised after good ones. An expense was a fixed amount, with growth, or a Derived
amount read on each Occurrence. Neither can hold a figure for a year, remember last year's amount, or
read the portfolio once at the start of retirement. This ADR adds a fourth amount form.

## Decision

- **The form.** An expense Flow takes `rule` instead of `amount`, `derive` or `level`. The Scenario
  stays `schemaVersion: 4`: the field is optional and every existing document is unchanged. A `rule`
  on any other kind of Flow is `RULE_NOT_EXPENSE`, at the `rule` key.
  - `portfolio`: one or more asset Accounts, summed. An unknown id is `UNKNOWN_ACCOUNT`, a liability
    `RULE_PORTFOLIO_LIABILITY`, an Illiquid asset `RULE_PORTFOLIO_ILLIQUID`, all at the id's index; an
    empty list is `MISSING_KEY` and a repeat `DUPLICATE_ID`. A locked Account is read at its full value,
    as ADR 0020 reads one, so an RMF before its unlock date counts toward the rule while the withdraw
    list still decides what can pay.
  - `rateBps`: a safe integer from 1 to 10000 (`RATE_OUT_OF_RANGE`). `rounding` is required, with no
    default (`INVALID_ROUNDING`). No rate or rounding exists in code, examples or the CLI.
  - `frequency` is `monthly` or `annual`: any other valid one is `RULE_FREQUENCY`, at `frequency`.
- **Rule years.** A Rule year is twelve monthly Occurrences, or one annual Occurrence, counted from the
  Flow's first Landed date (after its `start`, `startAt` and Calendar). That is a decision, not the
  anniversary rule: under a shifting Calendar the first Landed date on or after an anniversary can give a
  year of eleven or thirteen Occurrences (a monthly Flow from 2026-01-31 with `dayRule: "next"`
  first lands on 2026-02-02, and its 13th Occurrence, 2027-01-31, a Sunday, lands on 2027-02-01, a day
  before the anniversary). Counting Occurrences keeps "twelve parts sum to `Y` exactly", so every
  year pays `Y` and a year begins on the first Landed date of a thirteenth, twenty-fifth, ...
  Occurrence. With no shifting Calendar the two agree. On the first Occurrence of a year,
  before any Flow lands (the ADR 0020 valuation, `planned-on.ts`), the rule reads the portfolio `P` and
  fixes the year's amount `Y`. Two Occurrences on one date read one `P`.
- **Paid in equal parts.** Monthly: the k-th Occurrence pays `floor(Y × k / 12) − floor(Y × (k − 1) /
  12)`, so twelve sum to `Y` exactly (4,000,000 pays 333,333, 333,333, 333,334, four times). Annual:
  `Y` once. A year the horizon or a Shortfall cuts short has only its Occurrences.
- **`initialRate`.** `Y₀ = round(P₀ × rateBps / 10000)`; year `n` is `Y₀` grown by `economy.inflation`
  over `n × 365` days with the engine's existing whole-year growth (`money/growth.ts`, half-up).
- **`currentRate`.** `Yₖ = round(Pₖ × rate / 10000)`, where `rate` is `rateBps` or the last `steps`
  entry whose `from` is on or before the Rule year's first date (`STEPS_NOT_ASCENDING`, an empty list
  is `MISSING_KEY`). Optional `floor` and `ceiling`, each `{ amount, growth }` grown from the Flow's
  `start` by the whole years at the year's first Occurrence like a fixed amount, clamp `Yₖ` (so a
  gated Flow's bound has already grown by the years before it lands). When the floor lifts the year
  and the ceiling does not cut it, `action` is `floor`, also when the two amounts are equal. A floor
  amount above the ceiling amount is `RULE_FLOOR_ABOVE_CEILING` at `floor`; growth that later makes
  them cross is accepted, and the ceiling wins.
- **`guardrails`.** `Y₀` as `initialRate`. Each later year starts from `Y′`, last year's `Y` grown one
  year by inflation. With `upper`, when `Y′ × 10000 × 10000 > P × rateBps × (10000 + upper.bps)` the
  year pays `Y′ × (10000 − upper.adjustBps) / 10000` (`cut`); with `lower`, when `Y′ × 10000 × 10000 <
  P × rateBps × (10000 − lower.bps)` it pays `Y′ × (10000 + lower.adjustBps) / 10000` (`raise`);
  otherwise `Y′`. At least one of `upper` and `lower` is required (`MISSING_KEY` at `upper`); `lower`
  alone is a ratchet that never cuts. Every comparison is BigInt; `bps` and `adjustBps` are 0 to 10000.
  Hand case: 100,000,000 falling 10% a year at 4% with both bands of 2000/1000 pays 4,000,000 in 2026
  and 2027 (`4.0e14` is not above `90,000,000 × 400 × 12,000 = 4.32e14`) and 3,600,000 in 2028
  (`4.0e14` is above `81,000,000 × 400 × 12,000 = 3.888e14`).
- **Rounding.** `round` is the Flow's own `rounding` (`floor`, `ceil`, or `halfUp` with ties away from
  zero, as `scale`); the amounts are never negative. An amount or portfolio that is not a safe integer
  is `VALUE_OVERFLOW` at the date.
- **A fixed real amount is not a kind.** It needs no state: an expense with `growth: "inflation"`.
- **The rule only sets the expense.** Withdraw order, Shortfall and Settlement are unchanged. A Flow
  gated by `startAt` and `endAt` starts its first Rule year when the gate first lets it land; other
  expenses end at the same Milestone with `endAt`, or both are paid. The simplified guardrails have two
  bands on the withdrawal rate and nothing else: no skipping the inflation raise after a losing year, no
  limit near the end. They can be added later as optional fields.
- **The state.** `engine/rule-book.ts`: per rule Flow, the Occurrences it has landed and one record
  per Rule year (date, `P`, `Y`, paid, action). A run opens it with the Scenario (`undefined` without a
  rule Flow, so nothing else changes), `plannedAmounts` advances it, and the FI prefix, each candidate
  walk and its tail copy it (`cloneRules`).
- **The statement.** With `spendingRules: true` the Projection reports `spendingRules`: per rule Flow,
  per Rule year, `date`, `portfolio`, `amount`, `paid`, `withdrawalRateBps` (`floor(Y × 10000 / P)`,
  absent when `P` is 0, and above 10000 when `Y` exceeds a depleted portfolio) and `action`. `paid` is
  what the year's planned Occurrences added, including the Occurrence a Shortfall fell on in full,
  which the Projection's expense also counts. The day's `unmet` is the whole day across every
  expense, so spending Bands (#361) must split it by Flow, never subtract it from `paid`. Without the option the
  Projection is byte for byte what it was.

### Financial Independence

A rule reads Accounts, so FI treats it as ADR 0020 treats an account-reading Derived amount: no shared
window, the candidate's own walk and its tail past the horizon carry the rule's state.

- A walk records the portfolio's Accounts on every date its landing plans a rule Occurrence, and on
  every date the original plan has one (`account-values.ts` `readsOn`, `fi/read-dates.ts`,
  `fi/account-reads.ts`), so the read-dates rule of ADR 0020 holds and `at()` has a row wherever a
  window reads. The rule years in a window are fixed again from those values by the same code, over the
  events that land under the candidate's fire dates, with a book of its own per window
  (`fi/original-window.ts`). That is the same state the walk reached: a rule Flow is an expense, which
  FI never stops except under `retirementSpending`, and a window's events run from the Timeline start.
- A `next12Months` Metric is refused beside a rule Flow, with `NEXT_12_MONTHS_READS_ACCOUNT` at the
  Metric's `expenses` key: the line ADR 0020 draws for an Account something changes would let a rule on
  an untouched portfolio through, but a window that has not walked cannot know last year's amount a
  guardrails year carries. The refusal is wider than ADR 0020's, on purpose, with one exception: a rule
  Flow whose `startAt` names the Milestone the Metric sits on. A window keeps a Flow only if it has
  landed as of the window's date (`landsAt`), which needs that Milestone to have fired, and a
  Milestone's criterion is evaluated only before it fires, so such a Flow is priced at 0 in the window,
  correctly. Every other rule Flow (no gate, or a gate on another Milestone) stays refused, for all
  three kinds. `trailing12Months` is accepted. The same line is drawn in ADR 0020.
- `retirementSpending` replaces a rule Flow like any expense.
- The oracle `golden/oracle-rule.ts` (with `oracle-rule-year.ts`) counts Rule years as twelve Occurrences (one
  for an annual Flow) and fixes each year with exact integers; `oracleAccountFi` runs it per candidate.

## Considered options

- **Rule years by anniversary.** Rejected: a business-day shift can put eleven or thirteen Occurrences
  in a year, so a year would not sum to `Y`. The issue's "first Landed date on or after each
  anniversary" holds only without a shifting Calendar.
- **Rule years from the Flow's `start`.** Rejected: a gated Flow would begin in the middle of a year and
  its first year would pay a fraction of `Y`. The issue states the year from the first Landed date.
- **A rule state kept in the `StateMap` or the Levy set.** Rejected: neither is what the state is, and
  both are cloned by name in many places. A book of its own is cloned in four.
- **Pricing a rule in the Milestone window by a fixed rule year.** Rejected: see above.

## Consequences

- New codes in `ERROR_CODES`: `RULE_NOT_EXPENSE`, `RULE_PORTFOLIO_LIABILITY`, `RULE_PORTFOLIO_ILLIQUID`,
  `RULE_FREQUENCY`, `RULE_FLOOR_ABOVE_CEILING`. The CLI files them in `refusal-elsewhere.ts` until its
  own change makes them user-facing.
- Existing parity hashes are unchanged; `parity/cases.json` gains `rule-initial-rate`,
  `rule-current-rate-bounds` (with a chance of success), `rule-guardrails` and `rule-fi`.
- Hand-worked tests: `engine/rule-kinds.test.ts` (each kind on a constant-rate portfolio: 4,000,000,
  then 4,120,000 and 4,243,600 with 3% inflation; 4,200,000 and 4,410,000 on a portfolio growing 5%; a
  step to 5% giving 5,250,000; a floor of 4,300,000 and a ceiling of 4,400,000 binding; a cut to
  3,600,000 and a raise to 4,400,000; `lower` alone never cutting; a tie of one half rounding to 1, 1
  and 0), `engine/rule-pay.test.ts` (the twelve parts, the 7-in-12 split, an annual Flow, a year cut by
  the horizon after seven parts, a Shortfall on 2026-04-01 paying four) and `check/rule.test.ts` (every
  code at its path).
- `golden/rule-oracle.test.ts` replays each rule year from the oracle and agrees with every statement
  and with the Projection's annual expense; `golden/rule-fi.test.ts` agrees with the brute-force walk on
  the FI month and the reference expense for all three kinds, and shows a 4% rule moving the month from
  2027-03-01 to 2027-07-01 and the reference from 1,800,000 to 2,258,624.
- **Chance of success** runs the rule on each Market path unchanged. Its spending Bands are #361.
