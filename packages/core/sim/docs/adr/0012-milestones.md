# Milestones: dated, metric and chained points that gate Flows

Status: accepted

A plan says "when", not only "how much": stop working once investable assets cover 25 years of spending, sell the car two years after the last child leaves, start a pension at a date. A Flow's `start` and `end` can hold a date, but a condition on the plan's own figures depends on the Projection, so no date can be written in advance. The core needs an engine primitive for it. It stays closed-world (data, no callbacks), deterministic and free of ages (the Input Conventions: callers convert ages to dates).

## Decision

- **Data.** `Scenario.milestones` is an optional, non-empty list of Milestones with unique ids. Each Milestone has `combine` (`all` or `any`) and non-empty `criteria` with unique ids. A Criterion is one of four kinds: `date`; `milestone` (the named Milestone's fire date plus `months`, which may be negative); `metric` (a Metric compared with `amount`); `multiple` (`metric × den` compared with `base × num` in BigInt, so no rounding happens). A Metric is a named balance, `{ accounts }` (one kind only), or `{ expenses }` (a twelve-month window). Every money choice (balance, window, nominal or real terms) is a required field. Nothing defaults.
- **Flows gate.** `startAt` and `endAt` are optional Milestone ids on any Flow. A Flow with `startAt` lands only on or after the fire date; with `endAt` only strictly before it. Recurrence and growth stay anchored on `start`.
- **Static and dynamic.** A Milestone is static when every criterion is a date or names a static Milestone; its fire date is computed before the run, and the Landed date of an `all` (latest criterion date) or `any` (earliest) combination. Every other Milestone is dynamic and fires on the first evaluation date on which its criteria hold. A dynamic Milestone may not be offset backwards from another dynamic one (`MILESTONE_LOOKAHEAD`), because that needs the future.
- **Evaluation dates.** The dates on which a Flow's recurrence lands (ungated) and every Settlement date. On each one, before the date's Flows land, every Account is valued from the opening state; the dynamic Milestones are evaluated in dependency order, ties in Scenario order, so a Milestone fired on that date counts for the next one. Observation rows never evaluate, so `resolution` changes no fire date.
- **Expense windows.** `trailing12Months` is the expense this run landed in `[D − 12 months, D)`. `next12Months` is the planned expense in `[D, D + 12 months)` of the Flows that land as of `D` (a `startAt` already fired by `D`, and an `endAt` not yet fired by `D`), Derived amounts planned as the FI reference plans them. A window that starts before `Timeline.start` or ends past the horizon is partial, and a criterion that reads a partial window does not hold.
- **Terms.** `real` deflates each measured amount from its own date to `Timeline.start` before summing, as ADR 0007 fixes for the FI reference.
- **Output.** `Projection.milestones` lists every Milestone in Scenario order as `{ id, reached: true, date }` or `{ id, reached: false }`. It is present only when the Scenario declares Milestones, so a Scenario without them keeps every Projection byte-identical (parity cases `milestone-freelancer-*` are added; no existing hash changes).
- **FI and chance.** A `chanceOfSuccess` path is a full `runEngine` call, so it inherits the gates. The FI scan keeps its shared prefix: the Milestone state (fire dates and landed expenses) is saved with each prefix point and cloned into each candidate walk, which uses that candidate's own plan for `next12Months`. A deferred `once` Flow that a candidate's stop removes (earned income, or expenses under retirement spending) never lands in that candidate's walk, as its own events would not.
- **Two details the spec left open.** A `once` Flow whose `startAt` is dynamic is held back and lands on its fire date when its own start came first (on its start otherwise). A `once` Flow whose `startAt` is static is moved, when its start came first, to the fire date in `buildEvents`: that event is marked deferred, so it is a landing but not an evaluation date.
- **Refusals.** `INVALID_COMBINE` is added beside the codes the spec lists, since `combine` needs a closed-vocabulary code. An empty `milestones` or `criteria` list is `MISSING_KEY`, as an empty `levies` already is.
- **Calendar arithmetic.** `addMonthsClamped` now clamps to 0001-01-01 when months are subtracted past the first year. Every existing caller adds non-negative months, so no existing result changes.

## Considered options

- **Callbacks or a condition language.** Rejected: the core is closed-world, and a closed set of four Criterion kinds can express the cases the issue names.
- **Evaluating at every processed date, not only evaluation dates.** Rejected: observation rows would then move fire dates, which breaks the rule that `resolution` changes no figure.
- **A fixed point for same-day interaction.** Not needed: valuation comes from the opening state, before the day's Flows, so nothing that lands on a date can change whether a Milestone fires on it.
- **Fall back to full walks for FI when a Scenario has Milestones.** Rejected in favour of carrying the state through the prefix, which keeps one scan path. The spec allowed either.
- **Gating the FI reference and buffer windows.** Not done here. The rule-of-thumb reference and the minimum buffer still read the ungated plan (`expenseWindow` uses `buildEvents` for the original expenses); see Consequences.

## Consequences

- A Scenario without `milestones` keeps every number and parity hash. `Scenario.schemaVersion` stays 4, since the new keys are optional and additive (ADR 0006, ADR 0008).
- An FI month and a chance success count can change only through a gated Flow. `financialIndependence` and `chanceOfSuccess` have tests where a gate moves the answer, checked against a brute-force walk.
- **Open for the owner:** the rule-of-thumb reference's numerator and the minimum buffer read expenses from the ungated plan, so a gated expense still counts toward the 25× reference and the buffer. Changing that changes FI answers for scenarios with gated expenses and is a separate decision.
- The CLI and the Dashboard must spell `startAt`, `endAt` and each Criterion kind out in their own vocabulary (issues #215 and #216).
