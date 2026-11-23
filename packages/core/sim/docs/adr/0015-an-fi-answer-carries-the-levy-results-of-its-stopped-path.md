# A reachable survival FI answer carries the Levy results of the path it describes

Status: accepted

A survival answer names the earliest month whose stopped path survives (ADR 0004). The walk charges
each Levy only on what is left after earned income stops, but it threw the tallies away, so a caller
that wanted the tax the answer implies had to run `project()` on the Scenario. That run keeps earned
income going to the horizon, so it describes a different path from the one the answer names (cli#255).

## Decision

- A reachable survival answer gains `levies`: the `LevyReport[]` of the winning candidate's whole path,
  read as of the horizon. The months before the FI month are the unchanged Scenario's, the months from
  it on are the walk's, with earned income stopped (and expenses replaced by `retirementSpending` when the definition sets
  it) by the same events and Milestone gate the survival check used. The tallies are the ones the walk already holds, so nothing is recomputed by a second rule.
- `levies` is present only when the Scenario declares a Levy, so an answer without Levies is unchanged.
  An unreachable answer carries none: no candidate path is the answer.
- The probability-threshold answer is unchanged. It describes a share of Market paths, not one path.
- `financialIndependence` stays pure and still returns no Projection: a Levy report is data the walk
  already built, not a second run.

## Considered options

- **The caller ends every earned Flow the day before the FI month and projects it.** Rejected: it
  restates the scan's stop rule outside the engine and misses what the scan does that an `end` date
  does not, namely a Business-day landing across the month boundary, a deferred `once` Flow and the
  per-candidate Milestone gate.
- **Return a full Projection with the answer.** Rejected as larger than the need: rows and annual
  roll-ups for the stopped path are a second report the walk does not build.

## Consequences

- The `levy` frozen FI case and the parity hash of `levy-several-fi` change by the added `levies`
  key; no FI month changes.
