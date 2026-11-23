# The estate block is the caller's, and `projection run --estate` states what heirs would receive each year

Status: accepted. Ships in 0.8.0 (the `estate` block of `traj schema`, `projection run --estate`).

A person asks what their family would receive: everything owned, less what is owed, less what it costs to settle,
less any gift to a temple, a charity or a named person. The engine states it (sim ADR-0025): an optional `estate`
block on the Scenario that changes no other figure, and an Estate statement on every Projection row. A person, an
agent and the Dashboard need three things from `traj`: how to write the block, what the plan would leave in each year
and where it goes, and the plan with no block. The CLI adds no cost, rate or tax and computes no figure of the
estate; it publishes the document form and states the engine's statements.

## Decision

- **The block is the document's, and the engine's.** `traj schema scenario apply` publishes `estate` with `costs` and
  `gifts` (`src/scenario/shape/estate.ts`, the line in `estate-line.ts`). A line is one flat object, as a Flow is, with
  the keys of its two forms said in the descriptions and refused by the core's `check()`: a share states `of`, `bps`
  and `rounding` (required, no default), a fixed amount states `amount` and `growth`. A cost's `of` is `"gross"` or
  `{ accounts }`, a gift's is `"net"`, both read from the core's own vocabulary (`estate-terms.ts`). The shape tests
  probe every path, closed set and refusal against the pinned core: a share above 100%, an unknown Account and a
  liability as a base are refused at the path of the field that is wrong.
- **Every cost and gift is the caller's, and `traj` models no tax.** The document says so in its prose and in the
  block's description: `traj` ships no share, and Thai inheritance tax is not modelled (it falls on each heir above a
  per-heir threshold, which needs heirs and their relationship, and is a tax rule). An inheritance tax, a transfer fee, a
  sale tax or a stamp duty is a cost line the caller types. The worked example states its own, as example values: a
  1% settlement cost of the gross estate, a 3% selling cost of the example's home (ADR-0060) and a 5% gift of the net
  estate to a temple, each rounding half up.
- **`--decimal` writes a share as a percent string.** `bps` of a cost or a gift reads and prints as `"1.00"` for 100
  basis points, and a fixed `amount` as major units, found as every other money and rate field is: by the first words
  of its description (`ESTATE_UNITS`, `ESTATE_RATE_UNITS` in `src/scenario/shape/estate-terms.ts`), so `traj schema` and
  the conversion read one schema. The conversion is text and integers (ADR-0063's `percent.ts`), never a float: a share
  with a third place is refused at its path as `invalid_input`, never rounded. A fixed line's `growth` keeps its
  integer `bps`, as every growth does. `--set` values of a What-if follow the same form (ADR-0056).
- **`--estate` states what the plan would leave.** `projection run --estate` adds two tables (ADR-0027), present only
  with the flag. `estate` has one row per roll-up end (the row `realNetWorth` reads, as `--accounts` does), or per monthly
  row with `--monthly`: `{ date, gross, debts, costs, net, gifts, toHeirs, realNet, realToHeirs }`, money as decimal
  strings. `gross` is every asset Account, locked and illiquid ones and a home included; `debts` is every liability's
  amount owed; `net` is signed, and a negative one is stated as it is with `gifts` and `toHeirs` at `0.00`; `realNet` and
  `realToHeirs` are the engine's today's-money figures. `estateLines` has one row per date and line, `{ date, line,
  kind: "cost" | "gift", amount }`, each date's costs then its gifts, in the order the block states them.
- **The totals are the engine's.** `costs` and `gifts` of an `estate` row are the engine's `costsTotal` and
  `giftsTotal` (sim ADR 0025), so the CLI adds nothing and the Dashboard must not add money (web ADR-0002); a test
  checks `gross − debts − costs − gifts = toHeirs`, and that each total is the sum of that date's `estateLines`.
  Until #393 the CLI summed the lines; the bytes are unchanged.
- **A plan with no block is stated too.** The engine states the estate for every plan, so the table answers with
  `costs` and `gifts` at `0.00` and `estateLines` empty, and `net` is `gross − debts`; the result's notes then say that
  the Scenario states no settlement cost, name `estate.costs` as where one is written, and say that `traj` ships none
  and does not work out Thai inheritance tax. A plan with a cost line and no gift has no note.
- **Without the flag every output is byte for byte what it was.** A test compares a run with and without it, table by
  table. The block is part of the stored document, so the worked example's Scenario hash changed (`run-accounts.output`
  and `run-spending.output` carry it); no figure did, because the engine's estate is inert.
- **The human form prints one table.** With the flag the human form prints, after the body, the `estate` table by
  year (the roll-up ends, even with `--monthly`, which the long monthly table already states); `estateLines` is JSON's.
  Without the flag it prints nothing of it.
- **The Dashboard's contract accepts the new tables.** The projection run contract decodes `estate` and `estateLines`
  against the CLI's own golden (`run-estate.output`, the example with `--accounts`, which pins the gross estate with the
  home, the loan as a debt, each cost, the gift and `toHeirs`), and the reports export lists them. No page reads them yet.
- **What-if reads take the flag.** `--set`, `--without` and `--add` apply before the projection, so a What-if run
  states its own estate.

## Considered options

- **A table row per line in the estate table.** Rejected: one row per date is what a page reads for a year, and the
  lines are a second table so neither is a pivot.
- **No note for a plan with no block.** Rejected: `net` reads as what heirs keep, which it is not without a cost; the
  note says so once.
- **Refusing `--estate` on a plan with no block.** Rejected: the gross estate less debts is the first question a person
  asks, and the engine states it for every plan.
- **A tax rule for Thai inheritance tax.** Rejected for this phase, for the reason above (sim ADR-0025).

## Consequences

- The worked example gained an `estate` block, so every document or golden that holds the example changed its hash;
  a test that replaces the example's Accounts states an empty `estate: {}` so its lines do not name an Account the test
  removed.
- `costs` and `gifts` are the engine's totals, not the CLI's sums. The engine states no real gross, debts or costs:
  the Estate page shows only `net` and `toHeirs` in today's money (#366).
- The Estate page (#366) reads these two tables and no other estate figure.
