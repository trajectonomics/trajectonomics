# Estate statement: what a plan would leave, from the Projection's own rows

Status: accepted

A person asks what their family would receive: everything owned, less what is owed, less what it costs
to settle (court and lawyer fees, the costs of selling a home, a transfer fee), less any gift to a
temple, a charity or a named person. The figures are percentages of values, so they must be integer,
deterministic and the engine's, never a page's (web ADR 0002). This ADR adds the `estate` block to the
Scenario and the Estate statement to the Projection. It is optional and additive, so
`Scenario.schemaVersion` stays 4 (precedent: [ADR 0012](./0012-milestones.md)).

## Decision

- **The block.** `Scenario.estate?: { costs?, gifts? }`. A cost is `{ id, of, bps, rounding }` with `of`
  `"gross"` or `{ accounts: [...] }`, or `{ id, amount, growth }`. A gift is `{ id, of: "net", bps,
  rounding }` or `{ id, amount, growth }`. `bps` is 0..10000 and `rounding` is required, one of `floor`,
  `halfUp` or `ceil` (the Measure roundings), applied once to `base × bps / 10000`, ties away from zero.
  A fixed `amount` grows by whole years from `Timeline.start`, as a Flow's does (one half-up rounding).
- **Why it is inert.** The statement is computed after the run, from the Projection's rows: each row's
  `balances` are the only input besides the block. Nothing in the run, the Financial Independence walk or
  a chance path reads `estate`, so no row, roll-up, FI answer or chance result can change with it.
  Parity is the proof: the Projection with the block, asked without `estate: true`, is byte for byte the
  Projection without it.
- **Opt-in.** `project(..., { estate: true })` adds `Projection.estate`, one `EstateStatement` per row in
  row order. Without the option there is no key. With the option and no block, the statement is still
  stated, with `costs` and `gifts` empty and `net = gross − debts`, so a caller can state it for every
  plan. Every Annual roll-up end has a row, as the Projection reports it, so the CLI reads the row it
  needs; a monthly Timeline gives a statement per month, and a Shortfall ends the list on the runs-out
  date.
- **The figures.** `gross` is every asset Account's value, locked and Illiquid ones included
  ([ADR 0019](./0019-illiquid-assets.md): a home stays in Net worth). `debts` is every liability's amount
  owed. `costs` lists each cost line's amount, in the block's order, and `costsTotal` is their exact sum
  (`giftsTotal` likewise for `gifts`), summed in BigInt and checked as the other figures are, so a caller
  never adds the lines. `net = gross − debts − costsTotal` and is signed. A cost's share base is `gross`,
  or the sum of the named Accounts' values (a base below 0 counts as 0).
- **The order.** Debts and costs come before gifts, and a gift is taken only from a positive net. Each
  gift in order wants a share of `max(0, net)` (the net estate, not what is left) or its grown fixed
  amount, and takes `min(wanted, left)`, where `left` starts at `max(0, net)`. A later gift therefore takes
  only what earlier ones left, and the gifts never exceed it. `toHeirs = max(0, net) − Σgifts`, so
  `gross − debts − Σcosts − Σgifts = toHeirs` whenever `net ≥ 0`.
- **A negative net.** When debts and costs exceed everything owned, `net` is negative and is stated as
  it is; every gift is 0 and `toHeirs` is 0. The shortfall is `−net`: the core states no claim on anyone
  but the estate.
- **Real terms.** `real.net` is the row's `realNetWorth` less each cost deflated once by `economy.inflation`
  over the counted days from `Timeline.start` (half up), so it is deflated as the row is: each Account's two
  parts separately, then summed signed, and each cost once. With an empty block `real.net` is exactly
  `realNetWorth`. `real.toHeirs` is 0 when `toHeirs` is 0; otherwise it is `max(0, real.net − Σ deflated
  gifts)`, so with no gifts and a positive net it equals `real.net`. Only a negative net makes it differ
  (0 against a negative `real.net`). Deflating the finished `net` once would round differently from the
  row, by a unit or two, and the two would disagree on an empty block.
- **Only the totals, no more real figures.** `real` stays `net` and `toHeirs`: the Estate page shows only
  those two in today's money and states debts and costs as separate nominal lines, so the engine does not
  state a real gross, real debts or real costs. The two totals are what the page needs without adding.
- **No tax rule.** An inheritance tax, a transfer fee, a sale tax or a stamp duty is a cost line the
  caller states. Thai inheritance tax falls on each heir above a per-heir threshold and depends on who the
  heir is, so it needs heirs and their relationship and is a tax rule, which is the owner's. The core
  models none of it.
- **Refusals.** `check()` reads the block with the usual shape rules: unknown keys are `UNKNOWN_KEY`, a
  repeated id across costs and gifts `DUPLICATE_ID` at the repeat, an unknown Account `UNKNOWN_ACCOUNT`,
  a liability named in `of.accounts` `ESTATE_ACCOUNT_LIABILITY` (new), a repeated Account `DUPLICATE_ID`,
  an empty list `MISSING_KEY`, `bps` outside 0..10000 `RATE_OUT_OF_RANGE`, a missing `rounding`
  `MISSING_KEY`, a wrong `of` `INVALID_BASIS`, and a negative `amount` `NEGATIVE_AMOUNT`.
- **Overflow.** A figure outside the safe integers is `VALUE_OVERFLOW` on the row's date, a result and
  not a throw.

## Considered options

- **An estate that the engine runs through.** Rejected: costs and gifts are not cash flows, and a run
  that moved money for them would change every other figure.
- **Statements on the rows.** Rejected: a key on every row would change the bytes of every Projection;
  a separate list under an option does not.
- **Gifts as a share of what is left.** Rejected: "10% to the temple" would then depend on the order of
  the other gifts. A share of the net estate with a cap at what is left is stable and still never exceeds
  the net.
- **Modelling Thai inheritance tax.** Rejected for this phase, for the reason above.

## Consequences

- Existing parity hashes are unchanged. Three cases are added: `estate-home-month` (a home, a loan, a
  locked fund, shares and a fixed cost, with a gift), `estate-gifts-capped` and `estate-negative-net`.
- The independent oracle (`src/golden/oracle-estate.ts`) states each figure by its definition with plain
  loops and exact rationals, `costsTotal` and `giftsTotal` included.
- `costsTotal` and `giftsTotal` were added after the three parity cases; only those cases' hashes change.
- The CLI states these figures without computing any; its estate table is a later slice.
