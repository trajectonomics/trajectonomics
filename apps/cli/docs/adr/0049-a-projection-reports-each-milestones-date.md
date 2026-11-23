# A Projection reports each milestone's date, or that it was not reached

A Scenario declares its milestones in its document, which is `sim-core`'s (ADR-0024, sim's ADR 0012):
the CLI adds no model of them. `scenario apply`, `show`, `fork --set` and `diff` carry them through the
existing paths, and `--decimal` converts a threshold amount in a criterion like any other money field
(ADR-0047). What the CLI decides is what a Projection says about them.

## Decision

- **Output.** `projection run` carries a `milestones` entry in `tables`, beside `annual` and `monthly`,
  with one row per Milestone in Scenario order: `{ id, reached, date }`. A Milestone that fired has its
  date; one that did not has `date: null`. The entry is present only when the Scenario declares
  Milestones, so a Scenario without them has the same tables as before.
- **Compare.** `projection compare` gives each side its own `milestones` rows under `sides.a` and
  `sides.b`, present only where that side's Scenario declares them. Deltas between the sides are not
  part of this decision.
- **Human form.** An unreached row reads `not reached by <date>`. The date is the run-out month when the
  plan ran out, and the horizon otherwise. Both are already in the result, so nothing is computed. JSON
  keeps `null`: the sentence is a presentation, and the output schema states a date or null.
- **Compare's human form** prints each side's milestones as a table after the figures, not in the
  listing, so the rows are not printed twice.
- **Errors.** Every milestone code comes from `check()`. The CLI runs `check()` on the overridden
  document before a Projection, as ADR-0024 requires, so a `--set` that gates a Flow on an unknown
  Milestone is `invalid_input` at `--set`, with the engine's code and its document path in `details`.
  `projection_refused` stays for a problem the engine finds at run time, and no milestone code is one.
- **Age.** A milestone's `on` is a published date, so the household can anchor it (ADR-0048). An age
  criterion is a date criterion anchored by the household, which is #217. This decision adds no age kind.

## Considered options

- **A root `milestones` key on the Projection.** Rejected: a Projection's results are tables (ADR-0027),
  and the milestones table reads beside `annual` and `monthly`.
- **The sentence in the JSON.** Rejected: JSON must state a date or null, and a sentence in a date field
  would make the schema lie.
- **A new render-hint column for the sentence.** Rejected: the sentence depends on the run-out month and
  the horizon, which the column cannot see, so it is a presentation hook (`display`) on the hint.

## Consequences

- `RenderHint` (ADR-0027) gains two human-only hooks: `display` states a presentation of the result, and
  `blocks` prints tables after the body from the result as the command returned it. Both are read only
  by the human Format; `--json` ignores them.
- A Scenario without Milestones keeps every Projection, compare and golden byte for byte, because the new
  keys are present only when the Scenario declares Milestones.
- The Dashboard reads the same rows: `apps/web`'s contract accepts the table and the per-side field.

## Amendment (0.8.0): compare reports the change per year and per Milestone

The Decision above left deltas between the sides out. That is now reversed for two things, so a page
never subtracts money (web ADR 0002):

- **`tables.annual`.** `projection compare` gains an `annual` table, one row per Annual roll-up index
  present on either side, in index order. Each row states each side's `closingNetWorth`, `income`,
  `expense`, `contributions` and `interest`, and a `levy` when a side's Scenario holds one, each as
  `{ a, b, delta }`. `delta` is b minus a, computed in the CLI from the engine's integer minor units and
  printed at the Currency's scale. A side with no such year, or with no Levy, is `null` there.
- **`deltas.milestones`.** One row per Milestone id declared on both sides, in side `a`'s Scenario order:
  `{ id, a, b, months }`. `months` is `monthsBetween(a, b)`, the calendar months between the two dates (month boundaries crossed, so a one-day move across a month end is 1, as `fiMonths` counts), and is `null` when either side did not reach
  it. An id on one side only is not listed; its row is under that side's `milestones`. The key is absent
  when neither side declares Milestones, and an empty list when only one does.

**Why a year that differs has no change.** A side that runs out part-way through a year ends its last
period on the run-out day, so its period is partial and not the same span as the other side's. Two
partial periods are not comparable, as the horizon net worth already says. So a row whose `from` and `to`
differ between the sides, or that exists on one side only, has `delta: null`; each side's own figures
stay, with its period in `periods`. The shared `from` and `to` are `null` in that row, because no one
period is shared. The human table prints a blank change for such a year and says why.

**Why a compare without Milestones is not byte-identical.** `tables.annual` is always present, so a
compare gains the `tables` key even when no Milestone is declared. The bytes differ only by that added key,
which the goldens record; the milestone part is absent exactly as the Decision above says.
