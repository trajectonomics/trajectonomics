# Chance of success: the share of seeded Market paths that never run out

Status: accepted

ADR-0005 reserved the seams for a range of futures and named the Outcome distribution as the
stochastic output, separate from the Projection. The first public entry on those seams is
`chanceOfSuccess(baseline, scenario, timeline, { model, seed, paths })`: it runs the plan as written
over the seeded Market paths of one Return model and reports how often the plan holds to the
horizon, the net-worth Bands at each Annual roll-up end, and when the failing paths ran out. It
adds no growth rule and no Projection. Every path is a `runEngine` call with that path's Returns.

## Decision

- **Validation as data.** `check()` on the three inputs, `checkReturnModel` for the model, and a new
  `checkChanceOptions` for `seed` (`INVALID_SEED`, the rule the FI probability method already used,
  now shared) and `paths` (`INVALID_PATH_COUNT`). Problems come back as `{ ok: false, problems }`.
- **Paths.** `paths` is 1..10,000, the ADR-0005 cap; the FI probability case keeps its own cap of 200
  because it scans every candidate month. There is no default: the caller states the count.
  `marketReturns` yields one path's unresolved `Returns` at a time, so a 10,000-path run holds one
  path's rows at once. `marketPaths` is now built on it and its output is unchanged.
- **Success.** A path succeeds when the engine records no Runs-out. The horizon is inclusive, as in
  ADR-0005. `successBps = floor(succeeded × 10000 / paths)` in BigInt. Minimum buffer is not part of
  it, as the glossary's Success probability says.
- **Bands.** One Band per Annual roll-up end on the Timeline's grid, reporting closing net worth
  (`closingNetWorth`) at levels 10, 25, 50, 75 and 90. The levels are fixed, not caller-chosen.
- **Nearest rank, in integers.** For a sorted sample of N values, the Percentile at `level` is the
  element at index `ceil(level × N / 100) − 1`, computed as
  `(level × N + 99) / 100 − 1` in BigInt. There is no interpolation, so every value is one a path
  produced. The sort compares safe integers exactly.
- **Failing paths.** A path that runs out is pinned, un-grown, at the net worth it died with in every
  later roll-up (ADR-0005's rule), so it counts in every Band and in the sample's size.
- **Runs-out counts.** For each Annual roll-up, the number of failing paths whose Runs-out falls in
  that period. The index is the period the failure first happens in; the list is dense, so zero
  counts are reported.
- **Reuse.** Periods come from `buildPeriods` and closing worth from `buildRollups`, the same seams
  `project()` uses for one path. The engine is not copied.
- **One failing run fails the call.** When the engine returns a problem on any path (a
  `VALUE_OVERFLOW`, for example), the whole call returns `{ ok: false, problems: [that problem] }`,
  as ADR-0005 states for one overflowing path. A partial Chance of success would hide which paths
  were dropped.
- **Echo.** The result carries `definition: { modelId, seed, paths }` as the FI probability result
  does.

## Why no float

Every figure is an integer minor unit, a basis-point share or a rank. The only division is BigInt
integer division, and `Number()` converts a result that is already a safe integer. This entry never
divides a `Number`, so the result is the same under V8 and JavaScriptCore.

## Considered options

- **Interpolated Percentiles.** Rejected by ADR-0005: a reported value would be one no path made.
- **Band of the survivors only.** Rejected by ADR-0005: survivorship bias reports a booming plan
  exactly when it has failed.
- **Runs-out counts per date.** Rejected: at daily resolution a long horizon has thousands of dates,
  while the Annual roll-up is the unit a page draws.
- **Income, expense and interest Bands.** Left out. Income and expense are deterministic until a path
  is truncated, and the Runs-out counts already say where a path stopped. A Spending rule ends that
  premise for an expense: ADR 0024 adds spending Bands for a plan with a rule Flow.

## Consequences

- The output is nominal: Flow growth, inflation and Levies are as in the Scenario, and no real
  Percentile is reported (ADR-0005).
- The result is integer-only, so `parity/cases.json` records one `freelancer-chance` case. Its hash is
  an intended addition: the existing hashes are unchanged, and the case checks the entry's
  determinism under Bun and Node.
- A 10,000-path run costs about 10,000 engine runs. The cap bounds it. This entry has no default
  count, so ADR-0005's measured default budget waits for the caller that sets one.
- A failed path's Band value is the net worth it died with, not zero, so a plan that dies owing money
  reports the negative it reached, and a plan that dies holding a locked asset reports that asset.

## Amendment: per-path outcomes and the replay of one path

A Success probability of 82 per cent is hard to trust without seeing what a failing future looks like.
Every path is seeded, so any one of them can be replayed exactly. Two additions say so; neither moves
a number the entry already reported.

- **`outcomes: true`.** `chanceOfSuccess` adds `outcomes`: one `{ index, closingNetWorth,
  lowestNetWorth, lowestAt, runsOut? }` per Market path, in path order (the glossary's Path outcome).
  The figures are read from the roll-up net worth every path already produces for the Bands, so there
  is no second engine run, and the cost is a pass over each path's roll-ups. Without the option the
  result is byte for byte the old one; `freelancer-chance`'s hash is unchanged and a new
  `freelancer-chance-outcomes` parity case pins the extended result. `lowestAt` is the first roll-up
  that holds the least value, so a tie goes to the earliest. A path that ran out is pinned, so its
  `closingNetWorth` is the net worth it died with.
- **`projectPath(baseline, scenario, timeline, { model, seed, paths, index }, options)`.** It
  returns the Projection of Market path `index` under the run's seed, with the options `project()` takes, plus
  `returns`. The public handle is the index under the seed, not a per-path seed, which would leak the
  generator's internals and let two runs name one path two ways. `paths` is the run's path count,
  checked as chance of success checks it (1 to 10,000, else `INVALID_PATH_COUNT`), and `index` is 0 to
  `paths - 1`: an index at or past `paths` replays a path the run did not draw, so it is
  `INVALID_PATH_INDEX`, reported at `["selection", "index"]`. The path's draws start from its own seed
  (`pathSeed`), so path `index` is built without any earlier path's rows. The path is the engine's own `Returns`, so closing
  net worth and Runs-out equal `outcomes[index]` for every index (a test pins all 200 paths of a run).
- **`returns`.** One entry per Annual roll-up, one return per Account of the model, in basis points:
  the market's growth from the roll-up's first day through its last day, including the last day's
  growth. Months compound; days within a month accrue linearly, as the engine does (ADR 0005), so a
  roll-up that opens in the middle of a month takes `(days + r·(before + held)) / (days + r·before)` of
  it, and the pieces of a month split across roll-ups multiply back to `1 + r`. The product is exact
  BigInt fractions with one division, rounded half away from zero. A roll-up of a Timeline that starts
  on the first of a month and is a whole year compounds twelve whole rows, and a roll-up that is only
  the horizon day holds no growth and returns 0. The figure is the market's return, not the Account's:
  contributions and withdrawals are not in it, so it need not equal the change in an Account's
  balance. It also covers a different day from the net-worth roll-ups: `closingNetWorth` is read on
  `to`, before that day's growth, so `returns[k]` is one day of growth ahead of it as well as free of
  Flows.

## Amendment: when each Milestone fires across Market paths

A Success probability says how often the plan holds; it does not say when a Milestone fires in the
futures that reach it. The engine already dates every Milestone on every path, so the answer is in
hand. An option reports it, and changes no figure of the entry.

- **`milestoneDates: true`.** `chanceOfSuccess` adds `milestones`: one `{ id, reached, dates, byYear }`
  per Milestone of the Scenario, in Scenario order (the order ADR 0012 reports), read from the same
  engine run that feeds the Bands. `reached` is the number of Market paths on which the Milestone
  fired before the horizon; a path that ran out early cannot fire a later Milestone, so it counts
  only where the path lived to fire it. `dates` holds the 10th, 25th, 50th, 75th and 90th Percentile
  fire dates over the paths that fired it, with the nearest-rank rule the Bands use, on the month
  grid: each fire date is reduced to its calendar month (`year × 12 + month − 1`), ranked there, and
  reported as the first day of that month. A Percentile is therefore always a month some path fired
  in, never an interpolated date, and the day a fire landed on is not reported. A Milestone no path
  fired reports `reached: 0` with `dates: []` and `byYear: []`. `byYear` lists `{ year, paths }` for
  every calendar year that holds at least one fire, ascending; a year with none is left out.
- **Percentiles over fired paths only.** Ranking unfired paths last would let a 60th Percentile read
  as a date when 45 per cent never fired, so unfired paths are not in the sample. `reached` beside
  the dates says how many paths the Percentiles cover, and no path can report a date it did not make.
- **One engine run.** `runEngine` already returns each path's `MilestoneResult` list when the
  Scenario declares Milestones. The path loop keeps that list on the path's own `PathOutcome`, and
  the report is a pass over those lists, so the paths are never run a second time.
- **Outcomes.** With `outcomes: true` as well, every Path outcome gains `milestones`: a map from
  Milestone id to fire date for the ones that fired on it, in the run's order, empty when none did.
  With `outcomes` alone no Path outcome carries it.
- **Byte identity.** Without `milestoneDates`, no result key and no Path outcome field is added. The
  existing `milestone-freelancer-chance` hash is unchanged, and a new
  `milestone-freelancer-chance-dates` case pins the extended result and the per-path maps under Bun
  and Node.
