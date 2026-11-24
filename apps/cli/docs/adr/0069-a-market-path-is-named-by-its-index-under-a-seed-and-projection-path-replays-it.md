# A Market path is named by its index under a seed, and `projection path` replays it

Status: accepted. Ships in 0.8.0.

A chance of success of 82 per cent is hard to trust until a person has seen what a failing future looks like. Every
Market path is seeded, so any one of them can be replayed exactly (sim ADR 0011, amended). The engine now reports
each path's outcome and replays one path as a Projection. This is how `traj` reaches a person and an agent with them.
The CLI adds no figure: it names the paths, formats the engine's integers as money and states the run each path
belongs to.

## Decision

- **`projection chance --outcomes` adds two fields.** `outcomes` is one row per Market path, in path order:
  `index`, `closingNetWorth`, `lowestNetWorth`, `lowestYear` and `runsOut` (`{ date, unmet }`, or null), the
  money formatted as every chance figure is (a decimal string at the Currency's scale). `lowestYear` is the first day
  of the Annual roll-up whose closing net worth was the path's lowest, which the engine reports as the roll-up's index
  (`lowestAt`): the roll-ups tile the Timeline, so it is the Timeline's start for roll-up 0 and the day after the
  previous roll-up's last day otherwise. A tie for the lowest goes to the earliest roll-up, as the engine reports it.
  Without the flag the result is byte for byte what it was: the engine is not asked for outcomes and the goldens do
  not move. With it, one note says what the fields are and names the command that replays a path.
- **`representative` names the paths worth opening first**, so a reader (and the Demo snapshot) need not sort ten
  thousand rows: `p10`, `p50` and `p90` are the indexes of the paths at the 10th, 50th and 90th Percentile of
  `closingNetWorth` by nearest rank, `earliestRunsOut` is the path that ran out first (null when none did), and
  `lowest` is the path with the least `lowestNetWorth`. The rank is the engine's own, `ceil(level × N / 100)` of the
  paths ascending by closing net worth, so `p50` is the path that holds the Band's median. A tie is broken by the
  lower index, in every pick, so the choice is reproducible. Picking an index by rank orders the engine's integers
  and states no money, so it is not arithmetic on money that ADR-0058 keeps in the engine.
- **The human form prints every path, worst first**, through the table hint (ADR-0027): after the Bands, a
  `representative` table (the pick, its index and its closing net worth), then an `outcomes` table of every path
  sorted by closing net worth, the lower index first on a tie, with the run-out's date and shortfall in columns of
  their own. The hint's `display` sorts and flattens for the human Format only. The JSON keeps path order, which is
  the order `--index` counts in, and nothing is truncated (ADR-0027).
- **`traj projection path` is a new leaf**, not `projection chance --index`. Its result is `projection run`'s, not
  an outcome distribution, and ADR-0015 keeps one result shape per leaf. It takes `projection chance`'s flags
  (`--return-model` including `plan` and `--buckets`, `--paths`, `--seed`, the what-ifs and `--carry-in`), `projection
  run`'s opt-in flags (`--monthly`, `--breakdown`, `--liabilities`, `--accounts`, `--spending`, `--estate`) and
  `--index`, which is required. The engine's `projectPath` replays the one path, so only that path's draws are made.
- **The result is `projection run`'s plus the run it is a path of.** `index`; `definition`, the run exactly as
  `projection chance` states it (`{ modelId, seed, paths }`, one schema for both leaves); for `plan`, the `returnModel`
  echo (ADR-0068); and `returns`: for each Annual roll-up, each Account's compounded market
  return in basis points (`{ index, from, to, accounts: [{ account, returnBps }] }`). `returns` is the market's growth
  from the roll-up's first day through its last, so it need not equal the change in an Account's balance, and it covers
  one day more than the roll-up's closing net worth, which is read before that day's growth (sim ADR 0011). The
  schema says so. The human form prints the returns as a table of their own after the run's.
- **`--index` at or above `--paths` is refused**, as `invalid_input` at `--index` (`INVALID_PATH_INDEX`), with a hint
  naming the range `0..paths-1`. The engine decides; the CLI words it. A negative index is the same refusal.
  The Dashboard's `projection chance` contract takes `outcomes` and `representative` as optional keys, and its new
  `projection path` contract is the result above, each decoded against a golden the CLI wrote.
- **A path is named by its index under the run's seed.** `--seed`, `--paths`, the model and the Scenario are the
  run; `--index` is the path in it. A per-path seed was rejected: it would leak the generator's internals, and two
  runs could name one path two ways. The cost is that the same flags must be given to both commands, which the
  `outcomes` note says, and the result of `projection path` echoes the run (`seed`, `paths`, `modelId`,
  `scenario.effectiveContentHash`) so a reader can check that a replay is of the chance they read.

## Considered options

- **`projection chance --index N`.** Rejected: a Projection-shaped result under a leaf whose result is an
  Outcome distribution, against ADR-0015.
- **Percentiles of `lowestNetWorth` in `representative`.** Left out: the lowest path is the telling one; the
  Bands already say how the distribution sits.
- **Truncating the human table** to the first and last rows, as the Bands table does. Rejected: the rows are the
  paths, a person who asked for them wants all of them, and ADR-0027 truncates nothing.
- **Money in `returns`.** Rejected: a return is a rate, so it stays an integer of basis points, as `rate` and
  `volatility` do.

## Consequences

- Every output without `--outcomes` is byte for byte what it was; `traj schema projection chance` gains `--outcomes`,
  and `traj schema projection path` is new.
- An `outcomes` list of 10,000 paths is about two megabytes of JSON, which is the cost of asking for it.
- The page that shows one path at a time (#422) reads `representative` to open the telling paths and
  `projection path` to draw one.
