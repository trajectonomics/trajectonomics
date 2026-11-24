# Account fee: a yearly share of an asset's value charged every month, outside cashflow, on every path

Status: accepted

A Thai mutual fund commonly charges 1 to 2 per cent a year, and over thirty years that is a large share of
the final balance. Lowering the Account's `rate` by the fee works in one Projection, but in a chance of
success run a Market path's Return series replaces the rate, so the fee disappears exactly where risk is
measured. This ADR adds `fee` to an asset Account (#408), an optional additive field, so
`Scenario.schemaVersion` stays 4 (precedent: ADR 0021, 0026, 0027).

## Decision

- **The field.** `fee: { bps, rounding }`. `bps` (0 to 10000, `RATE_OUT_OF_RANGE` outside it) is the yearly
  share of value; `rounding` (`floor`, `halfUp` or `ceil`; no default, `INVALID_ROUNDING`) rounds each
  monthly charge. `rate` stays the Account's total return before the fee. With no `fee`, nothing is charged.
- **When.** On the last day of each calendar month, a Due date and an Occurrence: the Calendar shifts it to a
  Landed date like a Compounding date (a Saturday month end lands on the Monday). It is independent of
  `Timeline.start`; a month end that is the Timeline start is charged, as a Flow that starts there lands. A
  month is a twelfth of a year whatever its length, so there is no day count.
- **How much.** `value x bps / 120000`, rounded by `rounding`, where `value` is the ADR 0020 valuation read
  before any of the date's Flows land: growth accrued to the date, **Accrued interest included** (it is
  the holder's value, the one a sale would realise and a payout reads), and a Return series' own path value.
  It is exact BigInt arithmetic with no float: 1,000,000,000 at 150 bps is 1,250,000 on the first month end
  and 998,750,000 / 800 = 1,248,437.5 on the second, which `halfUp` and `ceil` make 1,248,438 and `floor`
  1,248,437. Twelve charges at `halfUp` come to 14,897,305.
- **It leaves the Account and goes nowhere.** It is no expense of the household and no income of anyone: it
  is in no cashflow, never routed, never an unmet amount, and no Shortfall. Net worth falls by it.
- **The order on a date.** The fee is *read* first and *taken* last. It reads the valuation before an
  employer share lands (ADR 0026), a payout leaves (ADR 0027), a planned withdrawal, a payment or the
  routing of cashflow touches the Account, and it leaves after all of them. It never takes more than the
  Account then holds, so a sale or payout of the whole Account on a month end leaves nothing to charge, and
  nothing a fee does can overdraw an Account or fail a withdrawal that was met.
- **Distribution.** Like a payout it takes no Cost basis and realises no gain, so a later sale realises
  against the whole basis. The Account's growth is attributed to its Returns tally up to the date and the
  base resets to the value after, so `returnLabel` counts growth gross of the fee: a fee is never a
  negative return, and no Levy deducts it.
- **Locked and Illiquid.** Both are charged (a locked fund's fee is paid, and nothing forbids a fee on a home).
  A liability may not carry `fee` (`LIABILITY_MISUSE` at `fee`).
- **A fee of 0 bps is no fee.** The Projection is byte for byte the one without it, with no `fees` field, and
  `check()` treats it as none: it does not make the Account one that can change for
  `NEXT_12_MONTHS_READS_ACCOUNT`.
- **`check()`.** An Account with a fee above 0 bps counts among those that "can change on a future date" for
  `NEXT_12_MONTHS_READS_ACCOUNT` (ADR 0020), since month ends move it. No new code: the refusals are
  `RATE_OUT_OF_RANGE`, `INVALID_ROUNDING`, `MISSING_KEY`, `UNKNOWN_KEY` and `LIABILITY_MISUSE`.

## Every path

A fee is not a Flow a person declares and not part of `rate`, so a Market path's Return series, which
replaces the rate, does not replace it. The engine adds, per Scenario and span, one marker event per fee
Account on each month end (`feeEvents`): an income Flow of 0 that lives in no Scenario's `flows`, so no list
of Flows shows it and it lands nothing. Because it is an event, everything that walks events reaches the
date: `project`, every Market path of `chanceOfSuccess`, the Milestone gate, and each FI candidate's walk,
which reads and charges its own Account. Two details follow: a fee date is an event date, so a Milestone
that fires on an evaluation date is evaluated there too; and the estate statement (ADR 0025) reads the
rows, so it states the Account after its fees and is unchanged in how it works.

## Reported

- **Annual roll-up.** `fees` (the total) and `accountFees` (a `{ account, amount }` per fee Account in
  Scenario order, 0 when it was not charged that year), present only when an Account carries a fee above
  0 bps. Lifetime fees are their sum. The fee leaves net worth outside cashflow, so `interest` stays the
  growth before the fee:
  `interest = closing − opening − income + expense + levy − unmet − employerContributions + payouts + fees`.
- **Cash-flow breakdown (ADR 0018).** Unchanged: the fee never enters cashflow, so the identity
  `money in + unmet = money out` holds with no new line.

## Considered options

- **A fee as an expense Flow.** Rejected: it would be in cashflow, could cause a Shortfall and would be
  an expense of the household, which a fund's fee is not.
- **A fee as a lower `rate`.** Rejected: a Return series replaces the rate, so a chance of success run
  would lose it, and nobody could see what fees cost.
- **A share of earnings, or a fixed amount.** Rejected for now: a share of value covers fund and platform
  fees, and a fixed yearly platform charge is an expense Flow. A fixed amount can be added later.
- **Charged first, before the date's Flows.** Rejected: it could overdraw an Account a sale empties, or fail
  a planned withdrawal that was met without it.

## Consequences

- Existing parity hashes are unchanged. Three cases are added: `fee-year` (two fee Accounts, one locked,
  with the breakdown and the estate), `fee-fi` and `fee-chance`.
- Hand-worked: `src/engine/fee.test.ts` (the twelve charges of each rounding, 14,897,305 at `halfUp`),
  `src/engine/fee-edges.test.ts` (0 bps; locked; Illiquid; Accrued interest, 1,262,329; the Business day;
  the Timeline start; an annual payout of everything, 986,335,615 to cash; a sale; an employer share; no
  Shortfall; the estate), `src/engine/fee-tallies.test.ts` (Cost basis, gain 49,874,765 against 50,000,000
  without the fee; Returns), `src/chance/fee-chance.test.ts` (a Return series path ends at 1,685,801,403
  against 1,716,100,000, and every Band is lower with the fee), `src/golden/fee-fi.test.ts` (FI 1 Oct
  2026, 1 Jan 2027 and 1 Dec 2027 at 0, 150 and 600 bps, each agreeing with a brute-force walk) and
  `src/check/fee.test.ts`.
- `src/golden/oracle-fee.ts` is an independent day-by-day walk that imports nothing from the engine;
  `fee-oracle.test.ts` agrees with it for every rounding at four rates and four fees across a leap year.
- The schema, documents and outputs of the CLI are #409.
