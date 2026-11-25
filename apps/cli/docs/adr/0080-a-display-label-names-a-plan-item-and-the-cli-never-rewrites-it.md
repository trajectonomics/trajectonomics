# A display label names a plan item, and neither the CLI nor the core rewrites it

Status: accepted (trajectonomics/trajectonomics#557)

`sim-core` now keeps an optional `displayLabel` on every Flow and every Milestone (sim ADR 0032),
so a plan's author can name an item in Thai or in English instead of accepting its id. The CLI is
the only writer of a Scenario, so it publishes the field in `traj schema` and states it wherever it
already states the id. A household's people are the CLI's own document (ADR-0048), so a person's
label is the CLI's field, not sim's.

## Decision

- **Flows and Milestones carry sim's `displayLabel`; the CLI adds no field of its own.** The field
  travels in the document, so every path that writes a document carries it:
  - `scenario apply <name> --file` and `--template` (in the document the caller edits);
  - `scenario apply <name> --set flows.<id>.displayLabel='"School fees"'` and
    `--set milestones.<id>.displayLabel='"Condo down payment"'`;
  - `scenario apply <name> --add 'flows={"id":"school-fees","displayLabel":"School fees",…}'`;
  - `scenario fork --set`, which applies the same Overrides;
  - `scenario household`, whose anchors write only dates and leave a label as the document states it.

- **`--set` may begin the key where an item leaves it out.** A plan written before this field has no
  `displayLabel`, so the first Set that names one adds it, as `--set accounts.<id>.volatility=…`
  already does (ADR-0068): `beginsDisplayLabel` allows it on any `flows.<id>` or `milestones.<id>`
  item, and the refusal that lists the keys at a path names it. Nothing else may be begun.
- **No `--label` flag is added.** The CLI has no per-item Flow or Milestone command: an item is
  written as JSON, and `--set`/`--add` are its per-item paths, so a `--label` flag would have to
  name the item too and would be a second spelling of `--set`. `traj schema scenario apply`
  publishes `displayLabel` with the rule, which is what a caller reads the field from.
- **Nothing trims or normalises a label.** A label with leading or trailing whitespace is refused,
  not rewritten: a Scenario round-trips unchanged, and the CLI never edits the text a caller wrote,
  exactly as the expense category decided (sim ADR 0018). The refusal carries
  `DISPLAY_LABEL_RULE` as its detail, so the caller knows what to change. The Dashboard's forms
  trim what a person typed *before* they send the Edit, so a stray space never reaches `traj`.
- **A household person gets `displayLabel` in the household document, version 1 and 2 alike.** It
  is optional, so a person without one is stored as they were and a household's canonical bytes do
  not change. The check reuses sim's `isDisplayLabel`, so the two documents share one rule; a value
  outside it is `invalid_input` at `people.<n>.displayLabel`.
- **`scenario show` states it by stating the documents.** The JSON already carries the whole
  document and household, so a label is there with the id; no new key, no new field. The human
  format prints the same document, so the label is read next to the id. `traj schema` publishes the
  field on a Flow, on a Milestone and on a household person.
- **A refusal names the rule.** `INVALID_LABEL` carries `DISPLAY_LABEL_RULE` as its detail, the way
  `INVALID_CATEGORY` carries the category's, and the refusal quotes it. `scenario apply` states it as
  `invalid_input`, naming the document path in the message, so `INVALID_LABEL` is not in its
  `errorCodes`: that is sim's check code, not one of the CLI's own.
- **A label is cleared by writing the document, not by a Set.** `--set` writes a value and cannot
  remove a key: `null` is the wrong type and `""` breaks the label's rule, so both are refused. A
  label is removed with `--file` (the document without its `displayLabel`) or by emptying the Name
  field in the Dashboard, which sends the whole document as an Edit.
- **The content hash moves when a label changes, as it does for any document field.** The hash is
  the canonical document's (ADR-0024), and a label is document content (sim ADR 0032), so
  `--if-hash` refuses a write that read another name. A plan without labels keeps its hash, and a
  document without one keeps its bytes: an absent optional key is absent from the canonical text.

## Considered options

- **A `--label` flag on `scenario apply`.** Rejected: it could only name one Flow or one Milestone
  with a second flag, which is `--set` with more moving parts, and the item still comes from the
  document on `--file`.
- **Trimming in the CLI or in `sim-core`.** Rejected: `check()` reports and never rewrites the
  caller's document (sim ADR 0018), and a CLI that trims would store text the caller did not send,
  so the content hash a caller computed would not be the hash it reads back.
- **A label on a household person outside the household document** (a keyed list beside it).
  Rejected: it would be a second place a person's facts live, and backup, export and restore already
  carry the household as one canonical document.

## Consequences

- Goldens change only where a test sets a label; every existing golden keeps its bytes.
- `traj scenario show --json`, `scenario apply --json` and the Snapshot's `documents` Read carry the
  field with no change to their schemas, which take the document as it is.
- The Dashboard reads `displayLabel` from the Snapshot's `scenario show` document and its household,
  shows the id in code when a label is absent, and trims a label in its forms before an Edit (web
  ADR 0029, amended).
