# Illiquid assets: a home or a car stays in net worth but leaves accessible net worth and the FI measures

Status: accepted

A home is an asset Account, and a person with a large home and little savings would read "25×
expenses met" and fire "investable assets cover 25 years of spending" Milestones from money they
cannot spend without selling the house. `lockedUntil` cannot stand in: it would also stop a planned
sale before that date. Owner decision (issue #287): a home or a car is a marked real asset. It stays
in Net worth, and the measures that ask what a person can spend leave it out.

## Decision

- **The mark.** An optional `liquid` key on an asset Account, a boolean. `liquid: false` marks an
  illiquid asset; absent or `true` means liquid, so every existing Scenario is unchanged. `liquid`
  on a liability is `LIABILITY_MISUSE`, as `lockedUntil` already is. The key is a boolean because an
  Account is either liquid or not, so no third state is needed. It is named `liquid`, not `real
  asset`, because `real` already means inflation-adjusted money.
- **Routing.** `check()` refuses an illiquid Account in `cashflow.withdraw` and in a
  `cashflow.surplus` step with `ILLIQUID_ROUTED` at the position that names it. A withdrawal cannot
  draw on it, so a Shortfall never sells it. `cashflow.contribute` is not refused: a contribution is
  money from cashflow into the asset, not a draw on it. A planned sale is a later primitive.
- **One definition.** `leftOutOfAccessible(rule, date)` in `src/engine/accessible.ts` says which
  asset values count toward Accessible net worth: a marked asset, or one still locked. Every reader
  below calls it.

## Which figures change

Only an Account marked `liquid: false` moves a figure. Without the mark, every number is the same.

Changed, for the marked Account:

- The Projection row's `accessibleNetWorth` and `realAccessibleNetWorth`.
- The Minimum buffer. Every check after an FI candidate's flows, so the FI month, the binding
  `minimumBuffer`, and the `bufferBreach.accessible` of a result can all move.
- The FI probability method's FI survival share, which reads the same buffer.
- The rule-of-thumb reference (ADR 0013) on the `unlockedAssets` and `accessibleNetWorth` bases: its
  `unlockedAssets` field, its `numerator`, `multipleBps` and `met`. The `threshold` is `multiplier ×
  annualExpenses`, so it does not change. The `netWorth` and `allAssets` bases keep the home.
- Milestone Metrics named `accessibleNetWorth` and `unlockedAssets`, and the criteria that read them.
  A Milestone that reads them fires later, or never. A `multiple` criterion whose `metric` is one of
  them moves for the same reason.

Unchanged, with or without the mark:

- Every balance, `netWorth`, `realNetWorth`, and the rollup `closingNetWorth`.
- Every routing result: a Shortfall, `runsOut`, `unmet`, the `undrawableMoney` binding (a marked asset
  is outside `withdraw`, so it was already undrawable), and the cashflow breakdown.
- `chanceOfSuccess`, except through a gated Flow. Success is "no Shortfall", and its Bands read net
  worth. The Minimum buffer is not part of it. A Milestone that gates a Flow on an accessible Metric
  moves the Flow, and so the path, exactly as the Milestone rule says.
- Milestone Metrics `netWorth`, `allAssets`, `liabilities`, `{ accounts }` (a named Account reads its
  balance whatever its mark) and expense windows.
- The FI month when no Minimum buffer is set and no accessible Milestone exists. The reference is
  informational and never decides the month. A Milestone that gates a Flow on an accessible Metric
  moves the Flow, and with it the month, as the Milestone rule says.

## Considered options

- **Liquidity by Account kind or by a category string.** Rejected: a closed boolean on the Account is
  the smallest rule that answers the question, and a category would need its own vocabulary.
- **Count the home and let the caller keep it out of `withdraw`.** Rejected: the reported measures
  would still call the home spendable, which is the reading the issue exists to stop.
- **Reuse `lockedUntil` with a far date.** Rejected, as the issue says: it also blocks a planned sale.
- **Refuse `contribute` into an illiquid asset.** Rejected: a home improvement funded from cashflow is a
  real use, and the buffer already reads the resulting value.

## Consequences

- Existing parity hashes are unchanged. Three cases are added to `parity/cases.json`, and none is
  replaced: `real-asset-home-fi` (a marked home, with the FI result), `real-asset-unmarked-fi` (the same
  plan unmarked) and `real-asset-home-milestone` (an accessible Milestone on the marked home).
- The hand-computed tests are `src/fi/illiquid-fi.test.ts` (a home moves the FI month from 1 Jan to
  1 Feb, and the reference figures), `src/milestone/illiquid-milestone.test.ts` (an accessible Milestone
  fires on 1 Apr instead of 1 Jan), `src/engine/illiquid-accessible.test.ts` (the rows) and
  `src/check/illiquid.test.ts` (the refusals).
  `src/golden/illiquid-oracle.test.ts` checks the engine against the independent oracle on the same
  home: the rows, the reference on each basis, the FI month with a buffer and the accessible Milestone.
- The CLI shape publishes `liquid` in `apps/cli/src/scenario/shape/account.ts`. The new code
  `ILLIQUID_ROUTED` is filed in the CLI's refusal table.
- A plan whose only asset is marked is refused with `SURPLUS_UNROUTED`: `cashflow.surplus` must name
  a liquid Account, and there is none. (Naming the marked Account there gives `ILLIQUID_ROUTED`.)
- A plan whose cash runs out while its money sits in a marked asset ends in a Shortfall, with
  `runsOut` on that date. Nothing sells the marked asset until the sale primitive (#286) lands, so the
  money is not drawn, however large it is.
- The CLI's withdraw note does not suggest a marked Account, since `check()` would refuse it. The
  field texts that describe accessible figures now say "not locked and not marked illiquid".
