# A what-if adds a list item with `--add`, after the removals and before the Sets

Status: accepted. Ships in 0.8.0.

A what-if (cli ADR-0056) could change an item that exists (`--set`) and take one out (`--without`), but
not put a new one in: `--set flows.<new>=…` is refused as an unknown id, because ADR-0024 only replaces
what is there. So a person could not try an extra loan payment, a new loan or a new Flow before saving it.
An **Addition** is the third kind of Override. It is transient like the other two, applied by the one
function a Projection and a write share (ADR-0057), so what is projected is what is saved.

## Decision

- **The flag.** `--add <list>=<json>`, repeatable. `<list>` is `accounts`, `flows` or `milestones`; the
  value is one JSON object. Levies are not on the list: a Levy is written with its labels by `scenario tax`
  (ADR-0040), and an item that skipped that would leave a Flow no Levy tallies. The first `=` splits the
  flag, as `--set` does.
- **The item names itself.** It must carry a non-empty string `id`, and the id must not already be in the
  list (an `--add` earlier on the command line counts). An id that exists is refused at the `--add`, with a
  hint that names `--set`. A list the document leaves out (`milestones`) is begun.
- **The order is fixed, whatever order the flags are typed in: every `--without`, then every `--add`, then
  every `--set`**, each group in command-line order, an item appended to the end of its list. So a
  `--set` reaches an item the same command adds; `--without flows.rent` with an `--add` of `rent` replaces
  the item; and a `--without` of an item the same command adds is an unknown id at the `--without`, as a
  `--set` on a removed item is (ADR-0056). The Dashboard builds its argv in this order.
- **The engine checks it.** The document after all three groups goes to `check()`, as every Override's
  does, so an added item is refused for exactly what a stored one would be. A refusal is the `invalid_input`
  of ADR-0024 at `--add`, with `details.path` the added item's path (`flows.extra`), `details.documentPath`
  the path inside the document (`document.flows.3.amount`) and `details.code` the engine's. The blame rule
  is the one the other Overrides use: the Override whose path covers the problem.
- **The echo.** Every projection result, `scenario fork` and the what-if form of `scenario apply` state
  `additions`: each added item as `{ path, value }`, the path `list.id` in the Override grammar and the
  value as given. `projection compare` states it per side. **It is absent when no `--add` was given**, so
  a result without one keeps its bytes (and a strict reader of today's shape keeps decoding); this differs
  from `removals`, which is always an array (ADR-0056).
- **The hash covers it.** `effectiveContentHash` is that of the document after the three groups, so an
  addition changes it as a Set does, and `scenario apply … --add` stores the hash a `projection run … --add`
  echoes (ADR-0057). `--if-hash` guards the write (ADR-0055).
- **`--decimal` applies.** Under it, each money field of the added item is a decimal string of the
  Currency's major unit, converted by `parseMinorUnits` through the published schema (ADR-0047, ADR-0056);
  a JSON number or too many places is refused at the `--add`. The echo keeps the item as given.
- **Where.** `projection run`, `projection compare`, `fi`, `projection chance`, `projection allowances`,
  `scenario fork` and `scenario apply <name>`. In a compare `--add` makes a what-if of the one Scenario,
  as `--without` does, and is refused beside a second one. `scenario apply` refuses `--add` beside
  `--file` or `--template`, as it does `--set`.
- **Household anchors are unaffected** (ADR-0048): an anchor names an existing item's date, and an added
  item has none; one that replaces a removed item has its anchor dropped with the removal.

## Considered options

`--set flows.<new>=<json>` creating the item was rejected: a `--set` on an unknown id is how a typo is
caught, and it would stop being one. An `--add` that replaces an existing id was rejected for the same
reason, and `--set` is the flag that does it. Additions after the Sets was rejected because a `--set` could
then never reach the item the same call adds. Always stating `additions` as `[]` was rejected because the
Dashboard's strict decoding of today's results would break before it learns the field, and every
projection golden would be re-recorded for a field nothing used.

## Consequences

A caller can try, and then keep, a new item with the same flags. A reader of the result must treat a
missing `additions` as none. A later grouping of an item's parts (a loan is an Account, a payment and a
draw) can be sent as several `--add`s in one call, and they are checked as one document.
