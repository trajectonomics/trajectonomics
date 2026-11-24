# An Account's payout and fee and an employer's share are the document's, and `projection run` states what each did

Status: accepted. Ships in the release after 0.8.0.

The engine pays an Account's value out as passive income (sim ADR 0027), charges it a fee on every path (sim ADR 0028)
and lands an employer's share in an Account outside the household's cash (sim ADR 0026). They reach a person only
through `traj`: `scenario apply` must accept them, `traj schema` must describe them so an agent can write them,
and `projection run` must state what they did so the Dashboard shows it without arithmetic (web ADR 0002). The CLI
adds no rate and computes no figure of them.

## Decision

- **The document is the engine's.** An asset Account takes `payout` (`bps`, `frequency`, `rounding`, and the optional
  `start`, `end`, `startAt`, `endAt`, `label`, `prepayments`) and `fee` (`bps`, `rounding`); a Contribution takes
  `funding: "employer"`. `traj schema scenario apply` publishes each (`src/scenario/shape/account-income.ts`,
  `flow-funding.ts`), with the engine's own closed lists (`PAYOUT_FREQUENCIES` is read from `allowedValues`, as every
  list is, ADR-0052) and the sentence that every rate is the caller's own: `traj` ships none. The shape tests probe
  every path, every closed value and every `required` key against the pinned core (`account-enums.test.ts`).
- **The worked examples are prose, not the example document.** The example's own Accounts and Flows are unchanged, so
  no golden that holds them moved. A payout-and-fee Account (`dividend-fund`) and the employer's 5% of the salary
  into `pension` are two documents in the schema's prose, as the initial-rate rule is (`example-income.ts`), and a test
  proves the pin accepts them beside the example. `--template` shows none: it is derived from the Ledger's Accounts
  and states no Flow (ADR-0033), so there is nothing a payout or an employer's share could sit beside.
- **`--decimal` writes a payout's and a fee's `bps` as a percent string.** `"3.50"` is 350 basis points, with at most
  two places, found as a rule's and an estate's rates are: by the unit its description starts with
  (`ACCOUNT_RATE_UNITS` in `src/scenario/shape/account-terms.ts`), so `traj schema` and the conversion read one schema
  (ADR-0047, ADR-0063). A payout's `prepayments` follow the income Flow's form, so their `bps` stays an integer
  beside it. `--set` values follow the same form (ADR-0056): `--decimal --set 'accounts.fund.fee.bps="0.50"'` is
  "what if my fund charged 0.5 per cent instead of 1.5". A test names the rate fields and round-trips every basis
  point from 1 to 10000. (The issue text kept these two as basis points; the percent form is the one the other
  caller-written shares have, and a form that types per cent is the use #410 has for them.)
- **A payout or a fee of 0 bps is none.** The engine treats it so; the CLI states no key and no table for it, and a
  test compares the whole run of a plan that declares both at 0 with one that declares neither.
- **One refusal is the CLI's own: no Thai contribution label on an employer share.** Every `ThLevyContributionLabel` is
  the member's own payment, ThaiESG (`allowance.thai_esg`) included, so labelling the employer's 5% `pvd` would count
  money the member never paid and understate tax. The engine stays permissive (a label is an opaque string there, and
  other tax systems do tally an employer's share), and the Thai Levy sees only summed tallies, so the refusal is here,
  where every plan reaches the engine. It reads `TH_LEVY_MEMBER_ONLY_LABELS`, the member-only list
  `@trajectonomics/core/tax` exports (every label of `ThLevyContributionLabel`), and never a prefix, which would miss
  ThaiESG. It is `EMPLOYER_MEMBER_LABEL`, found with the engine's problems by `scenarioProblems`
  (`src/scenario/own-problems.ts`), so `scenario apply`, the Store, `--set` and `scenario tax --label` state it, at the
  label, with a sentence and a way out. A Contribution that is not an employer's keeps its labels.
- **Four more refusals are said in words.** `CONFLICTING_LABELS` (a payout's `label` beside the Account's `returnLabel`,
  or `returnLabel` beside `gainLabel`, told apart by the path) and `RATE_OUT_OF_RANGE` at a payout's share, a fee's
  share and a payout's prepayments leave the unworded `document` answer for sentences, and `scenario tax` and the
  `label` field say which label a payout takes: `income.section40_4.dividends` from a dividend Account and
  `income.section40_4.interest` from interest. `EMPLOYER_INTO_LIABILITY`, `EMPLOYER_INTO_ILLIQUID` and
  `PAYOUT_ILLIQUID` were worded already.

## What `projection run` states

- **The annual row** gains `payouts`, `employerContributions` and `fees`, each present only when the Scenario declares
  its field, as the engine states them and as `withdrawals` is: a run without them keeps its bytes. `payouts` is inside
  `income`; `employerContributions` is outside `income`, `contributions` and `interest`; `fees` is outside cashflow and
  outside `interest`, which is growth before the fee.
- **The cash flow (ADR-0058)** gains two groups: `payout`, `{ account, amount }` from the engine's `payouts` list, and
  `employer`, `{ id: flow, account, amount }` from its `employer` list. A payout is money in: the roll-up's `income` is
  the declared Flows' income plus the payouts, and `cashflowTotalsOf` still takes `money in` from it, so the lines add up
  to the total only with the `payout` group, and the identity test sums them (`projection-income.test.ts`). An employer line
  is outside the identity: the money never entered cashflow. The human block prints `payouts` beside the income it is
  not part of, and the roll-up's employer and fee figures under the totals, marked as not cash.
- **A `fees` table** states what each fee Account was charged in each roll-up (`{ index, from, to, account, amount }`,
  the engine's `accountFees`, zero when not charged), present only when an Account carries a fee above 0 bps. The
  roll-up's `fees` is the sum of its rows. It is a table of its own, not a column of `balances`, because a fee has no
  monthly row and `--accounts` is a flag.
- **`compare` and `fi`** are unchanged: `compare`'s annual figures are a fixed list of fields and `fi` prints no roll-up.
- **Without the fields every output is byte for byte what it was.**
- **The Dashboard's contract decodes the new fields** (the three annual keys, the two groups, the `fees` table and an
  Account's `payout` and `fee`), with no page change.

## Considered options

- **A lifetime total per Account, in the result.** Deferred: the engine states none, and a sum in the CLI is a figure
  the CLI computes. A page that needs "fees over the plan" adds the `fees` rows, which #410 decides with the Dashboard.
- **Refusing a payout label in the engine.** Rejected for the label of an employer's share, for the reasons above.
- **Percent strings only in the form.** Rejected: the stored unit is the engine's basis points and a percent is a
  presentation of it, as major units are of minor ones (ADR-0063).

## Consequences

- The employer's money is stated twice by design: `employerContributions` on the row and the `employer` lines, each
  the engine's, and neither is in `money in`.
