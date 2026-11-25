# A display label names a Flow or a Milestone, and it is document content inside the hash

Status: accepted (trajectonomics/trajectonomics#557, part of #322)

The Dashboard can show a person only what `traj` states (web ADR 0002). It stated an id for a Flow
and for a Milestone, so a person read `school-fees` and `condo-down` on a card, a marker and a
picker. Turning an id into words in the page would state a guess as if the CLI had said it (web
ADR 0029). The plan's own author should name the item once, in Thai or in English, and every reader
shows that name.

## Decision

- **An optional `displayLabel` on every Flow and every Milestone.** It is the same key on all five
  Flow kinds, because it is part of the Flow's base rather than a kind's rules:

  ```json
  { "flows": [ { "id": "school-fees", "displayLabel": "School fees", "kind": "expense", … } ],
    "milestones": [ { "id": "condo-down", "displayLabel": "Condo down payment", … } ] }
  ```

- **The key is `displayLabel`, not `label`.** `label` already means the Tally label on an income
  and a contribution Flow (sim ADR 0009), and `traj scenario tax` and the household's Owners write
  it (cli ADR 0076). One object cannot give one key two meanings, and a display label is nothing a
  Levy sums.
- **Free text, 1 to 80 code points.** The rule is `DISPLAY_LABEL_RULE`, checked by
  `check/label-rule.ts`: no C0, DEL or C1 control code point, no line or paragraph separator, no
  zero-width space, non-joiner or byte order mark, no zero-width joiner outside an emoji sequence,
  no bidirectional control, no lone surrogate, and no leading or trailing whitespace. A value
  outside it is `INVALID_LABEL` at the label's path. It is the expense category's rule (sim
  ADR 0018) with a longer bound, stated once for both.
- **The core never trims or normalises a label.** A label that reads the same but differs in a byte
  would be a second label; the rule refuses edge whitespace instead of rewriting the author's text,
  as the category does. A Scenario round-trips unchanged (sim ADR 0018). A caller that takes a
  person's input trims it before it writes: the Dashboard's forms do (cli ADR 0080).
- **The engine's arithmetic never reads it.** No Projection figure, FI date, chance result, Levy
  tally, cash-flow line or Milestone fire date changes with a label, and `displayLabel` appears in
  no engine result. `check/display-label.test.ts` projects one plan with and without labels and
  compares the whole result.
- **It enters the content hash, because it is the document's content.** `contentHash` is the
  `jcs1:sha256:` digest of the stored canonical document (cli ADR 0024), so a label is covered with
  no code change. Two decisions follow, both wanted:
  - `scenario show` and `scenario list` report a new hash after a rename, and `--if-hash` refuses a
    write whose caller read the old name (cli ADR 0055). A rename is a change to the plan a caller
    read, exactly as a changed amount is, so it must move the hash.
  - A plan with no labels hashes exactly as it did before this field existed, because an absent
    optional key is absent from the canonical text and every existing parity case and golden
    document stays byte for byte the same.
- **The hash-based checks are otherwise unchanged.** Stale-plan detection compares two strings, and
  a label moves one of them; there is no new comparison and no new code path. `scenario foo --set
  flows.a.displayLabel="A"` and `scenario household` reach the same store path as any other change.

## Considered options

- **`label` on a Flow.** Rejected: it is the Tally label on income and contribution Flows, and
  `scenario tax` writes a Filer suffix onto it (cli ADR 0075). A second meaning would make the
  existing field ambiguous in `traj schema` and in every reader.
- **A label outside the hash.** Rejected. A rename would leave `contentHash` and `--if-hash`
  unchanged, so two callers could save different plans under one hash and one would silently win —
  the loss `--if-hash` exists to prevent. A field the document stores is the document.
- **A formatter in the Dashboard that turns `car-paid-off` into "Car paid off".** Rejected for the
  reasons web ADR 0029 gives: it is lossy and it states a name the CLI did not.
- **A label on an Account.** Rejected here: an Account's readable name already exists in the ledger
  (`traj account list`), which the Dashboard shows (web ADR 0029).
- **A label on a person of the household.** The household is the CLI's sibling document, not
  `sim`'s (cli ADR 0048), so the person's label is the CLI's field and ADR.

## Consequences

- `DISPLAY_LABEL_RULE`, `DISPLAY_LABEL_MAX` and `isDisplayLabel` are exported from the package, so
  the CLI checks a household person's label with the same rule rather than a copy.
- `INVALID_LABEL` joins `ERROR_CODES`; `UNKNOWN_KEY` stops refusing the field.
- `traj schema scenario apply` publishes `displayLabel` on a Flow and a Milestone (the CLI's ADR
  records the wording), and a document without a tax Levy still takes it: it needs no Levy, unlike
  a Tally label.
- No parity case changes: `bun run parity:update` is not run, because no figure moves.
- The Dashboard's item-name lookup has one more source to read, for the two kinds it now names.
