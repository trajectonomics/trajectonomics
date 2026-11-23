# A what-if takes a list item out by its id, and `--decimal` reads a `--set` amount in major units

A what-if switches a plan item off without saving it, and a page has to send a money amount without
converting it (web ADR 0002). ADR-0024 gives an Override one kind, a value that replaces an existing
path, which cannot switch an item off: `--set flows.gym=null` would rewrite the item's identity, and
ADR-0024 forbids that. So a **Removal** is a second kind of Override, written with `--without <path>`.
It names one list item by its stable `id`, such as `flows.gym` or `milestones.downsize`, and the
path must end there. A key, a whole list and an index are refused at the `--without`, with the hint
that `--set` is the flag that replaces a value.

## Decisions

- **Removals apply before the Sets**, in command-line order. A Set on a removed item is then an
  unknown path at its `--set`, with the nearest id as its suggestion. An exact repeat is refused, as a
  repeated `--set` path is.
- **The echo names the removals.** Every projection result carries `removals`, the removed paths in
  command-line order, beside `overrides`; it is `[]` when none were given, so the shape does not
  depend on the flags. Per side, `projection compare` states it under `sides.a` and `sides.b`.
- **The effective hash covers both kinds.** `effectiveContentHash` is the hash of the document after
  the removals and the Sets, so a removal changes it exactly as a Set does, and a what-if never
  equals the stored hash (ADR-0030).
- **A refusal names the Override at fault.** The core's problem is attributed by the rule ADR-0024
  uses for Sets: the removal whose path covers the problem, otherwise the last Override applied. A
  Flow a `derive` graph reads is refused at the `--without` that removes it, and nothing is removed
  silently.
- **`--decimal` is a flag of the five leaves that take Overrides**: `projection run`, `projection
  compare`, `fi`, `projection chance` and `scenario fork`. With it, a Set on a money field takes a
  decimal string in the Currency's major unit, converted by the CLI's exact `parseMinorUnits` as
  `scenario apply --decimal` converts it (ADR-0047). The money fields are found by walking the
  published schema, so a Set that replaces a whole Flow converts every money field inside it.
- **The echo keeps the value as given, and the document receives the converted one.** So
  `"90000.50"` echoes as the string, and the hash is that of the minor-unit document: the same what-if
  in either form has the same `effectiveContentHash`.
- **`projection chance` takes `--set`, `--without` and `--decimal`**, as `projection run` does, so the
  Chance of success page can show a what-if.
- **`scenario fork --without` persists the removal.** An anchor of the household whose item is removed
  is listed in `droppedAnchors` (ADR-0048), as a removed Set's anchor is.

## Considered options

`--set path=null` was rejected because a value cannot rewrite identity (ADR-0024), and a `null` would
either be a second meaning of `--set` or a silent removal. A `--set` that accepts a list of ids was
rejected because it would give one flag two grammars. Converting decimal Sets through the `money`
core's `toMinorUnits` was rejected for the reason ADR-0047 gives: it takes a `number`.

## Consequences

Both flags ship in 0.8.0. A projection's JSON gains `removals` on every echo, so a golden that pins a
projection's bytes is re-recorded once; its human format prints nothing new when no removal is given.
Removal is a second Override kind in the glossary, and the Dashboard contract accepts `removals` beside
`overrides`, so a page that shows a what-if can name what it removed.
