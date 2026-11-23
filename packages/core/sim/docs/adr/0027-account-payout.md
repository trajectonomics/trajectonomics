# Account payout: a share of an asset's value paid out as passive income, inside its total return

Status: accepted

Many Thai investors hold dividend stocks or dividend-paying funds and live on the payouts, and a fixed
deposit can pay its interest out instead of compounding it. An Account's `rate` was all growth that
stays in the Account. A fixed income Flow does not follow the balance, and a Derived income that reads
the Account creates money without taking it out of the Account. This ADR adds `payout` to an asset
Account (#407), as an optional additive field, so `Scenario.schemaVersion` stays 4 (precedent: ADR 0021, 0026).

## Decision

- **The field.** `payout: { bps, frequency, rounding, start?, end?, startAt?, endAt?, label?, prepayments? }`.
  `rate` stays the Account's total return. `bps` (0 to 10000) is the yearly share of value paid out;
  what is not paid out stays and compounds, so a fund at 8% that pays out 3.5% keeps 4.5% and what that
  grows. With no `payout`, everything is reinvested, as before.
- **When.** On the last day of each calendar period of `frequency` (`monthly`, `quarterly`, `semiannual`
  or `annual`), exactly as Compounding dates fall, independent of `Timeline.start` and of any id. Each is a
  Due date and an Occurrence: the Calendar shifts it to a Landed date like any Flow's (a Saturday month end
  lands on the Monday). A period end that is the Timeline start pays, as a Flow that starts there lands.
  Two Due dates that land on one date pay once. `start`, `end` (inclusive), `startAt` and `endAt` mean
  what they mean on a Flow: the first payout is the first period end on or after `start` and the last the
  last on or before `end`, and a Milestone gates it from its fire date or until it.
- **How much.** `value x bps / (10000 x periods a year)`, rounded by the required `rounding` (`floor`,
  `halfUp` or `ceil`; no default), where `value` is the ADR 0020 valuation read before the date's Flows
  land: growth accrued to the date, Accrued interest included, a Return series' own path value. It is exact
  BigInt arithmetic with no float: 1,000,000,000 at 400 bps paid quarterly is 10,000,000, and 300 satang at
  50 bps paid yearly is 1.5, which `floor` makes 1 and `halfUp` and `ceil` make 2. The payout never exceeds
  the value it is read from (`bps` is at most 10000), so no Account is overdrawn.
- **It leaves the Account.** The amount comes out of the Account on its date, after an employer share lands
  (ADR 0026) and before a planned withdrawal, a sale or a payment reads the Account, so a sale of the whole
  Account on a payout date sells what is left. It is a distribution, not a sale: it takes no Cost basis and
  tallies no Realised gain, and a later sale realises against the whole basis. The Account's growth is
  attributed to its Returns tally up to the date first and the base resets to the value after, so
  `returnLabel` counts growth whether or not it was paid out.
- **It lands as passive income.** The same amount is an income Occurrence with `earned: false`: in `income`
  and Available cashflow on its Landed date, routed like any income (`cashflow.contribute`, `surplus`), a
  contributor to what covers expenses, and it continues after work stops in the FI test (ADR 0012).
- **Tax.** `label` is the gross Tally label and `prepayments` are the shares taken at source, exactly as on
  an income Flow, so a Levy tallies the payout and the withholding is **prepaid against the Levy**: it is
  deducted from the cash the payout lands as, counted in the Levy's `prepaid` and credited against its `due`
  at Settlement, never lost. Both need a Levy (`LEVY_REQUIRED`), as on a Flow, and a payout `label`
  supplies a gross Tally to `UNSUPPLIED_TALLY_LABEL`. `returnLabel` is unchanged and counts growth, payout or
  not, so a Levy that wants the payout taxed uses `label`; `CONFLICTING_LABELS` now also refuses `label`
  beside `returnLabel` on one Account, which would tally the same money twice. `gainLabel` may sit beside it.
- **Locked and Illiquid.** A locked Account pays out (a locked fund's dividends are paid to the holder),
  and a payout of a locked Account's value is no withdrawal. An Illiquid asset may not carry `payout`
  (`PAYOUT_ILLIQUID` at `payout`), nor may a liability (`LIABILITY_MISUSE` at `payout`).
- **A payout of 0 bps is no payout.** The Projection is byte for byte the one without it, with no
  `payouts` field and no list.
- **`check()`.** `bps` outside 0 to 10000 is `RATE_OUT_OF_RANGE`, an unknown `frequency` is
  `INVALID_FREQUENCY`, an unknown `rounding` is `INVALID_ROUNDING`, `end` before `start` is
  `END_BEFORE_START`, a `startAt` or `endAt` that is no Milestone is `UNKNOWN_MILESTONE`, and a declared Flow
  with the id `payout:<account>` (the id a payout takes) is `DUPLICATE_ID`. An Account with a payout also
  counts among those that "can change on a future date" for `NEXT_12_MONTHS_READS_ACCOUNT` (ADR 0020).

## How it is built, and why it is not a Flow

A payout is not a Flow a person declares, because no Flow can say "a share of this Account that also leaves
it": a fixed income does not follow the balance, and a Derived income reading the Account creates money. The
engine expands each paying Account into one income Flow of its own (`withPayouts`, kept per Scenario, so a
Scenario with no payout is the very object it was), whose Derived amount is the `account` read and a
`scale` with the payout's `rounding`, and whose dates are the Account's period ends (`payoutOccurrences`).
Everything that already reads a Flow therefore reads the payout: the Milestone gate, a Levy's tallies and
Prepayments, the FI scan (it reads the Account like any Derived amount, so each candidate's walk reads its own
value), every Market path in chance of success, and the cash route. The one new engine step, `applyPayouts`,
takes the amount out of the Account. `project`, `chanceOfSuccess` and `financialIndependence` expand once
after `check()`.

## Financial Independence and chance

A payout is `earned: false`, so a candidate stops nothing of it: it carries spending after work. The scan
treats it as ADR 0020 treats an account-reading Derived amount (every candidate walks the read Account
itself, the windows are not shared). Chance of success runs the same engine on each Market path: the payout is
read from, and taken out of, that path's own valuation, and what stays grows on the path's series.

## Reported

- **Annual roll-up.** `payouts`, present only when a payout above 0 bps is declared. It is inside `income`
  (the money did arrive in cashflow) and outside `interest`, which is growth:
  `interest = closing − opening − income + expense + levy − unmet − employerContributions + payouts`,
  because the payout left an Account as it entered cash and moved net worth by nothing.
- **Cash-flow breakdown (ADR 0018).** A `payouts` list of `{ account, amount }`, in Scenario order, present on
  the same condition. `income` lists the Flows a person declared, so no payout id shows in it. The identity is
  `Σincome + Σpayouts + Σwithdrawals + Σdrawn + unmet = Σprepaid + Σsettlements + Σexpenses + Σapplied + Σsurplus`,
  and the roll-up's `income` is `Σincome + Σpayouts`.
- **Returns tally.** Unchanged: it counts growth.

## Considered options

- **A Flow kind or an Account field on a declared Flow.** Rejected: see above; and a fixed schedule cannot
  follow a Return series' path, which the chance of success must.
- **Payout on chosen dates.** Rejected for now: calendar period ends need no schedule and are independent of
  `Timeline.start`. A dated schedule can be added later without changing this.
- **Payout as part of `rate`.** Rejected: `rate` is the total return, and a payout that reduced it would hide
  that the money leaves the Account and arrives as income.
- **Withholding as a cost.** Rejected: it is a Prepayment against the Levy, credited at Settlement.

## Consequences

- Existing parity hashes are unchanged. Three cases are added: `payout-year` (with the breakdown, a label and
  a 10% prepayment under a 15% Levy), `payout-fi` and `payout-chance`.
- Hand-worked: `src/engine/payout.test.ts` (quarterly 10,000,000 + 9,900,000 + 9,801,000 + 9,702,990 =
  39,403,990 on 1,000,000,000, closing 960,596,010, interest 0; a 10% Account that pays 300 bps a year,
  33,000,000 then 35,211,000, where payout and Account together are the Account's growth; the rounding
  ties), `src/engine/payout-edges.test.ts` (0 bps; the window, `startAt`, `endAt`, `start`, `end`; leap-day
  and Business-day dates; a locked Account; a sale on the date), `src/engine/payout-levy.test.ts` (gross
  39,403,990, prepaid 3,940,399, due 5,910,599, Settlement 1,970,200; no gain and no basis taken, a later
  sale's 16,718,372 gain; Returns tally the same), `src/chance/payout-chance.test.ts` (a Return series path
  ends at 1,715,829,700), `src/golden/payout-fi.test.ts` (FI 1 Feb 2027 with the payout, 1 Dec 2030 without,
  each agreeing with a brute-force walk that runs the Projection for every month), and `src/check/payout.test.ts`.
- `src/golden/oracle-payout.ts` is an independent day-by-day walk that imports nothing from the engine;
  `payout-oracle.test.ts` agrees with it for every frequency and rounding at four rates across a leap year.
- The CLI files `PAYOUT_ILLIQUID` in its refusal table; the schema, documents and outputs are #409.
