# A projection run breaks each year into the lines the engine routed, and the CLI adds only the engine's own lines

Status: accepted. Ships in 0.8.0 (`projection run --breakdown`).

`sim` reports, per Annual roll-up, where the money came from and where it went (sim ADR-0018): each
Flow's income, each Levy's prepayment and settlement, each expense with its category, each Contribution
applied and dropped, each planned withdrawal, what `cashflow.withdraw` drew and what `cashflow.surplus`
filled. The Dashboard may compute nothing (web ADR 0002) and the CLI cannot rebuild the routing (cli
AGENTS rule 3), so the CLI shows the engine's lines and nothing else. This ADR records the shape of that
output, and where the CLI does arithmetic at all.

## Decision

- **Opt-in.** `projection run --breakdown` passes `cashflowBreakdown` to the engine and adds a `cashflow`
  entry to `tables` (ADR-0027). Without the flag the run is byte-identical to before: no key, no entry, no
  block.
- **A long table.** The entry is one row per Annual roll-up and line, roll-up by roll-up, in the engine's
  group order: `income`, `prepaid`, `settlement`, `expense`, `category`, `contribution`, `unfunded`,
  `withdrawal`, `drawn`, `surplus`, `unmet`. Every row carries the same keys (`index`, `from`, `to`,
  `group`, `id`, `account`, `category`, `amount`), with `null` where a key does not apply, so the output
  schema is one object and no line is a different shape. `id` is the Flow for Flow lines, the Levy for
  `prepaid` and `settlement`, the category name for `category` (null for the uncategorised total), and null
  for `drawn`, `surplus` and `unmet`. A `contribution` line is the applied amount and its `unfunded` line
  the dropped part, each present only when non-zero. A line whose amount is zero is left out, as the
  engine leaves it out.
- **Amounts are the engine's.** Each amount is an engine minor-unit integer formatted at the Currency's
  scale by the money formatter. A settlement keeps its sign, so a refund is negative.
- **Human form: one block per roll-up.** Each block prints after the body. Its section totals are the
  engine's figures where the engine gives one: `income`, `spending`, `saving` and `unfunded` come from the
  annual row, which carries those `AnnualRollup` fields; `unmet` too, when non-zero. A total the engine gives
  no field for is the exact integer sum of the engine's own lines, in minor units, and nothing else:
  `money in` (income, withdrawals and drawn), `tax` (prepaid and settlements), `withdrawals`, `drawn` and
  `left over` (surplus). Where the engine has a field for one of these (`levy`, `withdrawals`), its value
  equals that sum by sim ADR-0018's identity; the sum is taken from the lines because the annual row, and so
  the JSON, does not carry the field.
- **Why no total of the CLI's own.** The CLI prints no figure that is neither an engine field nor an exact
  sum of engine lines. The one arithmetic it does is that sum, and the identity in sim ADR-0018 is what makes
  it correct; `projection-breakdown.test.ts` hand-checks each printed total against the plan's numbers.
- **JSON carries the lines only.** The totals are not added to JSON: the long table is the contract, and a
  total in JSON would be a second figure a caller could disagree with.

## Considered options

- **Totals in JSON.** Rejected: the table would then state figures beside its lines, and the annual row would
  need `levy` and `withdrawals` to carry the same totals, which changes its bytes with the flag.
- **The long table in the human form.** Rejected: a person reads a year, not a list of routed lines. The
  block is that year; the table is the same lines for a program.
- **A block per line group, with its own table.** Rejected: five headings per year reads worse than one block
  with its totals and the lines under them.

## Consequences

- The blocks print after the body, which is after the annual table and the notes. A person reads the annual
  table first and the block below it, but not directly beneath the annual row.
- The web contract (`apps/web/src/lib/contract/projection-tables.ts`) accepts the `cashflow` table. No page
  reads it yet; the Cash flow page is #284.
- Every line is a row of the output schema, so the schema lists the groups and their meaning, and a new
  group is a schema change with its own decision.

## Addendum: the section totals are in JSON too (#337)

The Dashboard may not sum money (web ADR 0002), so the Cash flow page could not show a year's section totals
from the lines alone. The totals therefore go into the JSON, and this addendum replaces the decision above that
kept them out of it. The human block and the JSON now come from one function, so they cannot disagree.

- **A table of its own, in long form.** The entry is `cashflowTotals`, beside `cashflow`, present only with
  `--breakdown`. It has nine rows per Annual roll-up, one per section, in the order a person reads them: `money in`,
  `tax`, `withdrawals`, `drawn`, `spending`, `saving`, `not funded`, `left over` and `unmet`. Every row carries
  `index`, `from`, `to`, `total` and `amount`, so the table is one object like the `cashflow` table. It is not a
  `group: "total"` in `cashflow`, because a total has no `id`, `account` or `category` and would leave those keys
  null on every total row.
- **Wide was rejected.** One row per roll-up with a column per section reads well, but the nine names are the
  section list the human block shows, and a long table keeps the two shapes (lines and totals) the same way.
- **One function.** `cashflowTotalsOf` (`src/projection/cashflow-totals.ts`) computes a roll-up's totals in minor
  units from the annual row and that roll-up's lines. `cashflowTotalRowsOf` builds the JSON rows from it, and the
  human block calls it too. Each total is the exact integer sum of the roll-up's lines, or the engine's own
  field (`spending` is `expense`, `saving` is `contributions`, `not funded` is `unfundedContributions`, `unmet` is
  `unmet`); `money in` is `income` plus the withdrawal and drawn lines. Nothing is a float, and nothing is summed
  in the page. The sums are BigInt, and a total past the safe integers is refused as `VALUE_OVERFLOW` on the
  roll-up's last date (`projection_refused`), as the engine's own figures are (#393). The estate's two totals are
  not summed here at all: the engine states them (sim ADR 0025, cli ADR-0064).
- **Zero is stated.** A section with no lines is `0.00` in the JSON, where the human block leaves the line out.
  The block's own rules (which lines it prints) are unchanged.
- **Without the flag.** No `cashflowTotals` key is added, so a run without `--breakdown` keeps its bytes.
- **The identity.** Each roll-up satisfies `money in + unmet = tax + spending + saving + left over`, the sim ADR-0018
  identity under the same names. `projection-breakdown-totals.test.ts` hand-checks a normal year, a Shortfall year
  and a surplus that a cash cap splits across two Accounts, and pins each JSON total to the human block's figure.
- **Category rows are not totals.** The human block still prints one line per category under `spending`, from the
  engine's `category` lines. A category is not grouped by the totals, so a category of `" "` (a whitespace-only
  name, which the Flow schema accepts) stays its own category: the JSON names it `" "`, and the human block prints
  the line with a blank label, not as `(uncategorised)`, which is only for `null`. The engine is not changed.

## Addendum: payouts and an employer's share (#409, ADR-0067)

The engine's `payouts` and `employer` lists are two more groups, `payout` and `employer`. A payout is money in: the
roll-up's `income` already includes it, so `money in` is unchanged and the `payout` lines are what make the long table
add up to it. An `employer` line is outside the identity, because the money never entered cashflow. Neither group
adds a section total, and a plan with neither declares neither group.

## Addendum: transfers and per-entry routing (#416, ADR-0070)

A transfer moves money between the plan's own Accounts outside cashflow (sim ADR 0031), so it is in no line group and no section
total, and the identity above is unchanged. Its lines are a table of their own, `transfers`, `{ index, from, to, flow, source, target,
amount, unmoved }`, present with `--breakdown` only when the engine states one: a row carries one `account`, and a new key on every row
would change the bytes of every breakdown. The human block adds `moved between accounts (not cash)`, the roll-up's own `transfers` field, with a
line per transfer and what it did not move, under `left over`.

A `drawn` line gains `entry`, the position of the `cashflow.withdraw` entry that drew it, present only when the list declares a Reserve
floor (sim ADR 0030), so an Account listed twice reports once per entry. A surplus line has no entry, because the engine lists each Account
once (`DUPLICATE_ID`): its step is the one whose Account it names, which the `routing` echo states by position. The CLI computes nothing new here: the
echo's resolved figure for a target that keeps its value is not stated, because the engine does not state it (ADR-0070).
