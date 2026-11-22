# A household is a sibling of the Scenario, and its anchors are written into the Scenario on save

A plan belongs to a household: an account holder, maybe a partner who joins later, and dependents, each with the age they reach a date at. `traj scenario household` stores that household in a `household` column beside the Scenario's document, and it writes each anchored date into the document when the household is set. The Scenario document stays `sim-core`'s and its only validator stays `check()` (ADR-0024). A household restates no Scenario field.

The store gains schema version 3, which adds `scenario.household` as nullable canonical JSON. The step is an `ALTER TABLE ... ADD COLUMN`, so no existing row is rewritten: a Scenario saved before it has no household, which NULL states.

An anchor is a persisted assignment of one dotted path to a date, whose value is computed from a person:

- age N lands on the last day of the person's birth month in year `born + N`, so someone born 1990-06 turns 60 on 2050-06-30, and someone born 1992-02 turns 60 on 2052-02-29;
- `lifeEnd` is the age `lifeExpectancy`, and `joins` is a partner's join month on its first day;
- `lifeExpectancy` is always required, with no default, because no fact about a person is assumed.

The anchorable paths are the date fields of id-addressed items the published shape marks with `DATE`, so a milestone's date qualifies when the shape publishes it. `--horizon` stays a required flag (ADR-0030); the household never supplies it.

Writes resolve anchors: `scenario household` writes the dates, and `scenario apply` and `scenario fork --set` resolve a stored household onto the incoming document before `check()`. A missing value is filled in, an equal one kept, a different one refused at its path with the anchor in `details`, and an anchor whose item the document no longer holds is dropped and listed in `droppedAnchors`. A document `check()` refuses after its dates are written is reported at the anchor that wrote into the item it names.

## Considered options

A `sim-core` primitive that takes people was rejected. `sim` has no people and its glossary says callers convert ages to dates; a primitive would give the engine a second model of the plan, and the cores never import each other (AGENTS rule 3).

Resolution at read time was rejected. The stored document would show ages rather than dates, every reader (`projection`, `compare`, `fi`, the dashboard) would need the household, and the `contentHash` would not change when a birth month is corrected, so `fork` and `diff` would report an unchanged plan that changed.

A wrapper document holding the Scenario and the household together was rejected because it would be a second Scenario model beside `sim-core`'s, which ADR-0024 forbids.

## Consequences

A backup written at schema version 2 restores with every household null. The reader keeps an explicit layout per readable schema version and refuses any other, so a restore never guesses a column; a schema 3 backup is refused by an older build (ADR-0038). Export, backup and restore carry the household losslessly, as its canonical JSON text, and `scenario show` prints it.

A household's anchored dates are overwritten by the household, so a person who edits one by hand is refused at apply with the household that would move it, rather than silently losing or keeping the edit. `projection run --set` stays transient and is not re-anchored (ADR-0024).
