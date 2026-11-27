# `projection chance --milestone-dates` states when each Milestone fires across the Market paths

Status: accepted. Ships in 0.8.0.

A chance of success says whether a plan holds, not when its Milestones happen in the futures that
reach them. The engine already dates every Milestone on every Market path (sim ADR 0011, amended), so
`projection chance` can report that answer without a second run. A person reads how many futures
reach "stop work" and the month of the median one, with their age then.

## Decision

- **`projection chance --milestone-dates` adds `milestones`.** One entry per Milestone of the Scenario,
  in the order the engine reports them, which is the Scenario's order; the CLI never sorts them. Each
  entry is `{ id, displayLabel, reached: { paths, share }, dates, byYear }`.
  - `displayLabel` is the Milestone's label from the Scenario, or null when it gives none.
  - `reached.paths` is the number of Market paths on which it fired on or before the run's end: the
    horizon, or the day the path ran out. `reached.share` states that count as the chance's own success
    share does: the floored basis points as a decimal percentage, such as `91.20%`.
  - `dates` is `{ p10, p25, p50, p75, p90 }`, each the first day of the calendar month of that
    Percentile over the paths that fired, as the engine states it. `dates` is null when
    `reached.paths` is 0.
  - `byYear` is `[{ year, paths }]` for every calendar year that holds a fire, ascending.
- **Each stated date also carries each household person's age.** Every Percentile date is
  `{ date, ages }`, and `ages` is `agesOn(household, date)` from the CLI's own household code
  (cli ADR-0048): `[{ person, age }]` in household order, with each person's age on that date. A
  person who is not in the plan on that date is absent from that date's `ages`: a partner with a
  `joins` month before its first day, and a dependent before their birth month, are listed on later
  dates only. A plan without a household has `ages: []` on every date.
- **`--outcomes` together adds each path's fired dates.** Each outcome row gains `milestones`: a map
  from Milestone id to the date it fired on that path, in the run's order, empty when none did. With
  `--outcomes` alone no outcome row carries it, and without `--milestone-dates` the result has no
  `milestones` key: every existing output is byte for byte what it was. On a plan with no Milestones
  the flag states `milestones: []`.
- **The human form prints one line per Milestone**, after the Bands:
  `<label>: reached in 912 of 1000 futures; median Jun 2041 (age 52), 10-90%: Jan 2038 to Mar 2046`.
  The label is `displayLabel` or the id. One person's median age reads `(age 52)`; several read
  `(me 52, partner 50)`, and a date without a household omits the parentheses. A Milestone no path
  reached reads `<label>: never reached in 1000 futures`. "Never" is the engine's `reached: 0` at
  the run's end, which includes the paths that ran out early.
- **`traj schema projection chance` publishes the flag and the fields.** `--milestone-dates` joins
  the input, and `milestones` joins the output beside `outcomes`, so an agent reads their shape from
  the CLI rather than guessing.
- **The Snapshot asks for the dates only where a plan declares Milestones.** `scenario list` gains
  `hasMilestones`, the same way it marks `taxed` and `hasNotes`; the Dashboard's Plan reads it and
  passes `--milestone-dates` to that Scenario's chance read. The Dashboard contract takes
  `milestones` as an optional key, and each outcome's `milestones` map, so a Snapshot without them
  still decodes. The Demo snapshot changes on its next generation; it is never committed (web ADR
  0021). The page that draws them is #693.

## Considered options

- **Sorting the Milestones by id or by median date.** Rejected: the engine and `projection run` keep
  Scenario order (sim ADR 0012), and a second order is a second answer to which one is first.
- **A new `projection milestones` leaf.** Rejected: the answer belongs to the chance run, which
  already has the paths and their end, and ADR-0015 keeps one result shape per leaf.
- **Ages on the fire date rather than the reported month start.** The engine reports Percentiles as
  month starts, and a date and its ages must agree; the ages are therefore the ages on the stated
  date.

## Consequences

- A chance run with the flag does slightly more work in the CLI (household lookups), never a second
  engine run.
- The JSON result can grow by five dates and one age list per Milestone; a 10,000-path run does not
  multiply that.
- The Chance page (#693) reads `reached`, `dates` and `byYear` directly and needs no figure of its
  own.
