# Cash-flow breakdown: one report per Annual roll-up, by source, Levy, category and Account

Status: accepted

A person asks where each year's money came from and where it went. `AnnualRollup` has totals only
(income, expense, contributions, levy, interest, unmet), with no split by Flow, Account or category,
and withdrawals and surplus fills are not reported at all. The page may compute nothing (web ADR 0002),
and the CLI cannot rebuild the routing (cli AGENTS rule 3), so the engine reports the breakdown. This
ADR adds that report under [ADR 0017](./0017-liability-statements.md)'s option pattern, as the first
slice of the yearly cash-flow breakdown (#190).

## Decision

- **Opt-in through `project`'s options.** `ProjectionOptions` gains `cashflowBreakdown?: boolean`.
  Without it the Projection is byte-identical: no key, no observation date, and the run records no
  lines. The engine records each date's lines only when the run is asked to (`runEngine`'s breakdown
  flag), so Financial Independence and chance runs keep their figures and take the same time within
  noise (`bun run bench` before and after, same machine).
- **One breakdown per Annual roll-up.** `Projection.cashflow` lists one `CashflowBreakdown` per
  roll-up, with the same `index`, `from` and `to`. It has these lines:
  - `income`: planned gross per income Flow, before Prepayment.
  - `prepaid`: Prepayment per Levy.
  - `settlements`: each Levy's Settlement, signed, so a refund is negative. A Settlement is in the
    period that contains its settlement date, as the roll-up's `levy` field already places it.
  - `expenses`: planned per expense Flow, with its `category` when it declares one.
  - `categories`: expenses summed per exact category string. Order is the first expense Flow in that
    category, in Scenario order; `null` (no category) comes last.
  - `contributions`: per contribution Flow, the `applied` amount into its Account (a debt payment or an
    asset grant) and the `unfunded` part.
  - `withdrawals`: planned withdrawal Flows, with the liability each borrowed from.
  - `drawn`: what `cashflow.withdraw` gave up, in list order.
  - `surplus`: what `cashflow.surplus` filled, in list order.
  - `unmet`: the Shortfall left when the run ends.
  Lines follow Scenario order (Flows, Levies) or the routing list order, and a line whose amount is zero
  over the period is omitted.
- **Every figure is what the engine applied.** A Flow's amount is the occurrence amount the engine
  landed (a fixed amount grown, or a Derived amount evaluated that date). A Levy's Settlement is the
  Levy's own Settlement on that date. Contributions, withdrawals, drawn and surplus are read where the
  engine moved the money. Nothing is recomputed.
- **The identity, exact in minor units, per roll-up:**
  `Σincome + Σwithdrawals + Σdrawn + unmet = Σprepaid + Σsettlements + Σexpenses + Σcontributions.applied + Σsurplus`.
  The routing spends every unit of cash, so there is no change-in-cash term. A positive net fills
  surplus, whose last step is unbounded (`SURPLUS_UNROUTED`), and a negative net is drawn through
  `withdraw` or ends the run as `unmet`. Each total equals its roll-up field: `income`, `expense`,
  `contributions`, `unfundedContributions`, `levy` (= Σprepaid + Σsettlements), `withdrawals` and
  `unmet`, and Σcategories equals Σexpenses.
- **Same-date contributions split back to Flows.** [ADR 0003](./0003-cap-asset-contributions.md) sums
  same-date contributions per Account before its cap. The breakdown then splits each Account's applied
  amount back to its Flows in Scenario order, first come first served. The engine's Tally funding
  (`appliedByLabel`) splits the same Account amount in engine order, so two labelled Flows into one capped
  Account may split differently between the breakdown and the Levy tallies; balances are unaffected.
  An asset Flow's unfunded part is its planned amount less its applied amount. A debt payment capped
  at the amount owed is not unfunded, which matches `unfundedContributions`, so the planned-but-owed
  gap is in no line.

## Considered options

- **Always report the breakdown.** Rejected: it would change every existing Projection's bytes, and the
  parity hashes with them.
- **Compute it in the page or the CLI from the rows.** Rejected: the rows do not carry the routing, and
  the page may compute nothing (web ADR 0002).
- **Split same-date contributions in the engine's id order.** Rejected: the report follows the order the
  person declared the Flows in, and the engine's own split of the Account still decides every balance.
- **A cash line, so the identity carries a change in cash.** Rejected: no cash is held back, so the
  line would always be zero.

## Consequences

- Existing parity hashes are unchanged. Five cases are added to `parity/cases.json`, all with the
  option: `cashflow-hand-year`, `cashflow-categorised-freelancer`, `cashflow-levy-refund-day`,
  `cashflow-levy-shortfall-day` and `cashflow-loan-borrow-day`.
- The hand-worked year (`src/golden/cashflow-cases.ts`) has its figures written out by hand in
  `cashflow-breakdown.test.ts`, and an independent day-by-day oracle (`src/golden/oracle-cashflow*.ts`,
  which imports nothing from the engine) agrees line by line. The oracle models no Settlement and no
  capped Prepayment, so it covers the hand-worked year only.
- Every parity fixture is checked with the option on: every other figure is unchanged, and the identity
  and the roll-up totals hold.
- A Levy's Settlement falling beyond the horizon is not in the breakdown, as its `levy` field is not.

## Amended by ADR 0027

A Scenario that declares a payout adds a `payouts` list (by Account) to the breakdown. `income` still lists the
declared income Flows, so money in also sums `payouts`, and the roll-up's `income` is `Σincome + Σpayouts`.

## Unchanged by ADR 0028

An Account's fee leaves net worth outside cashflow, so the breakdown has no fee line and money in plus unmet
still equals money out. The roll-up's `fees` is reported beside it, and `interest` is the growth before the fee.

## Amended 2026-11-25: a category has no blank or invisible code point

`categories` groups by the exact category string, so two strings that read the same but differ in bytes
would split one group in two (`"a"` and `"a "`), and a string that reads as nothing would make a group
no one can name. `check()` decides this at the source: a category that is not text is `WRONG_TYPE`, and
text is `INVALID_CATEGORY` unless it is 1 to 64 code points (the length is counted in code points, so 64
emoji fit and a decomposed accent counts as two) with:

- no control code point: C0 (U+0000 to U+001F), DEL and C1 (U+007F to U+009F), as before;
- no line or paragraph separator (U+2028, U+2029);
- no zero-width space, non-joiner or byte order mark (U+200B, U+200C, U+FEFF), and no zero-width joiner
  (U+200D) except inside an emoji sequence, where it sits between two pictographs (a variation selector
  or skin tone may come before it), as in a family or a rainbow flag;
- no bidirectional control (U+202A to U+202E, U+2066 to U+2069), which can reorder a printed category;
- no lone surrogate, a UTF-16 unit that is no text and that a JSON reader may replace or reject;
- no leading or trailing whitespace (the ECMAScript `\s` set, which includes U+00A0 and U+3000), which also
  refuses a category that is whitespace alone. A space inside a category is kept.

Grouping stays exact: a category is never trimmed or normalised, so `"Cafe\u0301"` and `"Caf\u00e9"` are two
groups and the breakdown reports what the document says. Refusing is the choice because trimming would
rewrite the document the person wrote (a Scenario round-trips unchanged) and a silent merge would hide the
typo.

- **Known cost.** U+200C and U+200D are refused anywhere outside an emoji sequence, so text in a script
  that needs them is refused: the zero-width non-joiner and joiner of Persian, Urdu, Devanagari and other
  Indic scripts, for one. A category in such a script has to be written without them. Emoji, including
  joined sequences (a family, a rainbow flag, a person with a skin tone and a job), flags, Thai, CJK,
  other right-to-left scripts and accented Latin pass. Other format characters (soft hyphen U+00AD, word
  joiner U+2060, Hangul filler U+3164, Braille blank U+2800) are not refused: the list is the set that hides
  a category or reorders it, and a wider list would refuse text people write.
- **Existing documents.** A document whose category meets the older rule but not this one is now refused
  at `category`; every document without such a category is read, and every Projection and breakdown is
  byte for byte as before (the parity hashes are unchanged).
- **The refusal names the rule.** `INVALID_CATEGORY` is one code for every way to break the rule, so the
  CLI quotes `EXPENSE_CATEGORY_RULE`, which `sim` exports, beside the code.

## Amended by ADR 0034

The same lines are also stated per Reporting year (a year that begins on the 1st of a month the caller
chooses) and per Reporting month (a calendar month), under `ProjectionOptions.reporting`, as
`Projection.cashflowYears` and `Projection.cashflowMonths`. Each is the sum of the days it covers, cut by the
As-of, the horizon or a run-out date and then marked `partial`, and the identity above holds for every one.
There is no roll-up field for those spans, and no balance is stated. `cashflow` and its bytes are unchanged.
