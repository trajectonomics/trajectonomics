# A plan remembers which values `traj` wrote, and a Set states one

Status: accepted (trajectonomics/trajectonomics#689, part 2). Amends ADR-0033 and ADR-0044.

`scenario show` lists the Assumed values of a plan (ADR-0083), and the first kind is a value the
template wrote that no edit has touched. Nothing in the document says which value `traj` chose and
which a person typed, so the store records it beside the document.

## Decision

- **The `unstated` column (schema 6).** `scenario.unstated` is nullable `TEXT`: canonical JSON of the
  entries `{ path, source }`, sorted by path, and `null` when the list is empty (`[]` is never
  stored). The step is a plain `ALTER TABLE ... ADD COLUMN`, so a schema 5 row opens at 6 with NULL
  and every other column unchanged. A row from before the column, or a document from an older
  build, lists no `template-default`; the derived kinds still list, because they read the document,
  not the column.
- **The seed.** Only `scenario apply <name> --template --as-of <date>` seeds it, with
  `economy.inflation`, every Account's `.rate` and every Flow's `.amount`, source `template`. That
  write form is new: `--template` with no name still prints, and a name needs the As-of it pre-fills
  from; without one the refusal is `invalid_input` at `asOf`. A name a live plan holds is refused
  with `scenario_name_taken` and nothing is written; `--dry-run` is allowed. `--file` seeds nothing,
  because the CLI cannot know where a piped document came from, so a `--file` document is the
  author's own.
- **The clearing rules.** An entry stays only while its value still resolves in the stored document
  and in the written one and the two are equal, and no `--set` names its path or an ancestor of it.
  A Set at the same value therefore clears it, and the write is `updated` with the `contentHash`
  unchanged: a Set is something a person typed. A whole-document `--file` at the same value keeps
  it, because the document alone does not say who wrote the value; the hint and the Dashboard's
  Keep (#690) are the way to state it.
- **The kind.** `template-default` joins `ASSUMED_KINDS` first, with the value as `scenario show`
  prints it: a decimal amount is a decimal string under `--decimal`, while inflation and rates stay
  integer basis points. Within the kind the order is inflation, then Accounts in document order,
  then Flows. The hint names `--set <path>=<stored minor value>` and works as printed.
- **The other writes.** A fork copies the source's entries and treats its own Set paths as stated;
  removals and additions need no rule because a missing value fails to resolve. Household and tax
  writes keep the entries whose values they leave alone. A saved what-if passes its Set paths as
  stated, while `projection run --set` is a read and changes nothing.
- **Interchange and restore.** Schema 6 adds `unstated` to the Scenario record after the main-plan
  flag. An older layout has no field and restores with NULL, and a schema 5 backup restores
  unchanged. An unknown `source`, an empty path or a duplicate path is refused at its record path.
- **`source` stays open.** It is one closed list for now, `template`, and #687 adds `history` for the
  run-rate kind to the same column.

## Considered options

Telling a typed value from a default by comparing the document with the template at read time was
rejected: the template is a function of the Ledger and the date, a schema 6 document can come from a
hand edit, and every reader would need the Ledger open. Storing a boolean on each value in the
document was rejected because the document is `sim-core`'s and rejects unknown keys (ADR-0024).
Clearing on any write to the value's item was rejected: a Set at the same value leaves the document's
bytes unchanged, so nothing but the Set itself can tell that a person stated it.

## Consequences

A plan created by the template write lists its defaults; a plan created with `--file` lists none,
which is a known limit until the customer skills use the write form. The `unstated` column changes
`scenario apply`'s form rules, so ADR-0033 and ADR-0044 are amended: `--template` takes a name only
with `--as-of`, and that form writes instead of printing. The export gains a field and a schema
version, and a backup from an older build restores with NULL. The web contract's kind list and every
`scenario show` consumer gain `template-default`; goldens of plans not created by the template write
do not change.
