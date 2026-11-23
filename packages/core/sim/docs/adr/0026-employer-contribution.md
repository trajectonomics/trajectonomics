# Employer contribution: a third funding kind that lands in an Account outside the household's cash

Status: accepted

Most salaried people in Thailand save through a provident fund: the member puts in a share of salary
and the employer adds a share. The employer's share is real money in the fund that never passes
through the household's cash and is not on the payslip. A target Contribution is capped by Available
cashflow ([ADR 0003](./0003-cap-asset-contributions.md)) and an obligation is paid from the
household's cash or the `withdraw` list ([ADR 0021](./0021-buy-and-sell-an-asset.md)), so either way
the household paid for money it never had; income plus a Contribution overstated income and the tax
tallies. This ADR adds `funding: "employer"` as an optional additive value, so `Scenario.schemaVersion`
stays 4 (precedent: ADR 0021).

## Decision

- **The kind.** `FUNDINGS` is `target`, `obligation`, `employer`. An employer Contribution takes
  `amount` with `growth`, or `derive` (usually a share of a salary Flow's gross, [ADR 0020](./0020-derived-amounts-read-an-account.md)).
  `rule` is refused as for any Contribution (`RULE_NOT_EXPENSE`), and `level` is refused as
  `LEVEL_TARGET_NOT_LIABILITY`, because a level payment repays a loan and the target is an asset.
- **Where it lands.** In its target on its Landed date, in full, with the growth accrued to the date, in
  account-id order and summed per Account. It lands first on the date, before planned withdrawals are
  netted, debt, obligations and targets, and nothing after reads it as cash: it is not in `income`,
  `expense`, the day's net or Available cashflow, so it is never capped, never `unfunded`, never drawn
  from the `withdraw` list and never a cause of a Shortfall. A date on which it is the only Flow is a
  date of its own, with no income and no cash.
- **Routing.** `cashflow.contribute` need not list the target: `CONTRIBUTION_UNROUTED` does not apply.
  `cashflow.withdraw` may list the target: unlike an obligation, nothing is paid for out of the household
  and booked in, so a draw that takes it back out is the household using money that was already in the
  Account. `OBLIGATION_TARGET_WITHDRAWN` does not apply.
- **Cost basis and Tallies.** The applied amount adds to the Cost basis of an Account with `gainLabel`,
  as any applied Contribution does (the same `mutate`), so selling the fund realises no gain on the
  employer's money. It counts in a Levy's `funded` Tally only under the `label` its author gives it: an
  unlabelled share is in no Tally, and a member's own label never picks it up. The caller decides
  which label (the CLI refuses an `allowance.retirement.*` label on it, #409), because only the member's
  own money is deductible. An Account's `returnLabel` tallies its growth on the employer's money as on
  any money in it.
- **Locked and Illiquid targets.** A locked target receives it and holds it until `lockedUntil`, as for
  any Contribution. An Illiquid asset is refused: `EMPLOYER_INTO_ILLIQUID` at `funding`. A liability is
  refused: `EMPLOYER_INTO_LIABILITY` at `funding`, in place of `FUNDING_ON_LIABILITY`, so one mistake is
  one refusal with its own words. An unknown value is still `INVALID_FUNDING`, which now lists three.

## Financial Independence

An employer Contribution stops with earned income. From the candidate month it is 0, whether fixed or
derived: an employer pays only while the person works. (A derived one already fell to 0 by reading a
stopped salary; a fixed one stops by this rule.) A pension that keeps paying after work stops is an
income Flow with `earned: false`, not this. Nothing is recomputed: the scan's `stopsFlow` drops its
events as it drops earned income, and the expense window drops them unless an expense reads them, as
for earned income (a derived expense or debt payment that reads one is `DERIVED_EXPENSE_READS_EARNED`
or `DERIVED_DEBT_PAYMENT_READS_EARNED`). Vesting (a share forfeited by leaving early) is out of scope:
a person who expects to leave states a shorter `end`.

## Chance of success

Unchanged. The same engine lands the share on each Market path, with the path's own growth on the Account
after it lands.

## Reported

- **Annual roll-up.** `employerContributions`, present only when the Scenario declares an employer
  Contribution, so every other Projection is byte for byte what it was. It is outside `income` and
  `contributions`, so the savings rate and the cash-flow totals are not distorted, and outside `interest`:
  `interest = closing − opening − income + expense + levy − unmet − employerContributions`.
- **Cash-flow breakdown (ADR 0018).** An `employer` list of `{ flow, account, amount }`, present on the
  same condition and in Scenario order. It is outside the identity: the money never entered cashflow, so
  money in still equals money out.

## Considered options

- **Income plus a Contribution.** Rejected: overstates income and the tax Tallies, and the household
  appears to fund it.
- **A third Flow kind.** Rejected: it is a Contribution with a different source of money, as an
  obligation is one with a different cap.
- **Keep paying in the FI test.** Rejected: an employer pays only while the person works.

## Consequences

- Existing parity hashes are unchanged. Two cases are added: `employer-year` (with the breakdown) and
  `employer-fi`.
- Hand-worked: `src/engine/employer.test.ts` (fixed and derived with zero Available cashflow, the cap a
  member's own Contribution meets, basis, Tallies, a locked target), `src/golden/employer-year.test.ts`
  (a year: income 60,000,000.00, employer 3,000,000.00, identity 60,000,000.00 = 60,000,000.00, agreed
  with `oracle-cashflow.ts` and `oracle-account-walk.ts`), `src/golden/employer-fi.test.ts` (FI 1 Jan 2028,
  not the 1 Oct 2026 a share that kept paying would give; 1 May 2028 without it), `src/check/employer-funding.test.ts`.
- The CLI files `EMPLOYER_INTO_LIABILITY` and `EMPLOYER_INTO_ILLIQUID` in its refusal table; the rest is #409.
