# A plan can be renamed, carry notes and be marked the main plan without its document changing

Status: accepted. Ships in 0.8.0.

A person who compares "retire at 55" with "retire at 60 and buy a condo" ends up with several plans and needs to keep them straight: give a copy a better name, write down what a plan assumes, and mark the one that is their real plan. `traj` could copy (`scenario fork`) and remove (`scenario rm`) a Scenario, but could not rename one, keep notes on it, or say which one is the main plan. An agent asked "what does my main plan say?" had to guess (#418, part of #190).

Three decisions follow, and each one keeps the Scenario document and its `contentHash` out of it.

## Rename keeps the id

`scenario rename <scenario> <name>` changes the `name` column of the live row and nothing else: the id, the document, the `contentHash`, the household, the stored tax profile (ADR-0066), `forkedFrom` and `createdAt` stay, `version` goes up by one and `updatedAt` is set. A name is a label for the row (ADR-0018); the id is what a sync, a `forkedFrom` and a Dashboard link keep hold of, so a rename that made a new row would cut a plan from its own history.

The name rules are the ones every Scenario name has, and one more. A name that a live plan already holds is refused as `scenario_name_taken` with `details.scenarioId` (ADR-0021). An empty name and a name shaped like a UUID are refused as `invalid_input` at `name` (ADR-0018). A name of more than 100 characters, counted as Unicode characters, is refused as `invalid_input` too. The 100 is new and `rename` alone holds to it: `apply` and `fork` name a plan under the rules they had, and a plan already stored under a longer name keeps it. Renaming a plan to the name it has is already true, so it exits 0 with `status: "unchanged"` and writes nothing (ADR-0021). The name a rename leaves is free for a new plan at once, as after `scenario rm`.

`--dry-run` executes the write and rolls it back (ADR-0019). `--if-hash <contentHash>` is checked in the write's transaction before the name is looked at, and a stale one is `scenario_changed` (ADR-0055). The hash covers the document and a rename does not move it, so `--if-hash` here says "rename this plan only if it is still the one I read".

## Notes are metadata outside the hash

`scenario notes <scenario> --text <text> | --file <path | -> | --clear` keeps plain UTF-8 text in a new nullable column, `scenario.notes`. The text is at most 10,000 characters and holds no control character except the newline and the tab. A Windows line ending (`\r\n`) is read as a newline, so a file saved on any system stores the same text; a lone `\r` is a control character and is refused. Empty notes are refused with a hint to clear them, so `null` is the one way to say "no notes". Exactly one of the three forms is named.

Notes are not part of the document. The Scenario document is `sim-core`'s and its only validator stays `check()` (ADR-0024); a field of ours in it would be refused by the engine, and a note would change the `contentHash` that `--if-hash`, `scenario diff` and the Dashboard compare. So a write of notes changes `version` and `updatedAt` and no byte of the document. `scenario apply` and `scenario tax` leave the notes as they were, as they leave the household. `scenario show` prints `notes` (the text, or `null`) and `scenario list` prints `hasNotes`, so a list stays small however long the notes are.

`scenario fork` copies the notes, because a copy is the same plan with one change and the reason the plan exists travels with it. `--no-notes` leaves them behind, for a copy that starts a different story. The notes of a plan removed by `scenario rm` go with its row.

## The main plan is a label, not a default

`scenario main <scenario>` marks one live Scenario as the ledger's main plan, and `scenario main --clear` takes the mark off. At most one live Scenario holds it: marking another moves the mark in one write and the result names the plan it left in `previous`. The statuses are `set`, `moved`, `cleared` and `unchanged`; marking the plan that already holds the mark and clearing when none does are already true and exit 0 (ADR-0021).

The mark is a column of the Scenario row, `scenario.main`, with a partial unique index that allows one live row to hold it, not a row in a settings table. A column travels through backup, restore and export as every other column does (ADR-0038), without a new table, a new record type or a new count in `doctor` and `inspect`. Moving the mark bumps the `version` and `updatedAt` of both rows it touches, since both rows changed. `scenario list` and `scenario show` print `main`. A fork is never the main plan, and a Scenario applied under a new name is not either.

`scenario rm` of the main plan is refused as `scenario_is_main` (exit 5, a conflict with what the ledger holds) and the hint names `scenario main` to choose another, or `--clear`. `--force` removes it anyway and clears the mark in the same write; the result then carries `mainCleared: true`, which is absent otherwise, so a removal of any other plan prints what it printed before.

**Reads are unchanged.** `projection run`, `projection compare`, `fi` and every other read still need `--scenario`. The main plan is a label for people, agents and the Dashboard to say "my real plan", and it does not choose a plan for a command that was not told one. A default would change what existing commands mean the day a plan is marked, and an answer that names its plan is an answer a reader can check.

## Storage

The store schema moves to version 5 with `ALTER TABLE scenario ADD COLUMN notes TEXT`, `ALTER TABLE scenario ADD COLUMN main INTEGER NOT NULL DEFAULT 0 CHECK (main IN (0, 1))` and `CREATE UNIQUE INDEX scenario_one_main ON scenario (entity_id) WHERE main = 1 AND deleted_at IS NULL`. No row is rewritten: a Scenario saved before this step has no notes (NULL) and is not the main plan (0), and the upgrade copies the database first as every upgrade does (ADR-0050). `scenario rm` clears the mark in the tombstone's own write, so no tombstone holds it.

The export's Scenario record gains `notes` (a string or `null`) and `main` (`true` or `false`) after `tax`, and the header's `schemaVersion` is 5. A schema 4, 3 or 2 backup restores with every `notes` null and every `main` false, and a schema 5 backup is refused by an older build (ADR-0038). A restore checks what a write would have: notes are held to the rules above, a `main` that is not a boolean is refused at its path, and a deleted plan or a second plan marked main is refused, because no command writes either.

## What the output adds

`scenario list` prints `hasNotes` and `main` on each row, and `scenario show` prints `notes` and `main`. They are always printed, `false` and `null` included, so a caller never has to tell "absent" from "false"; this changes the bytes of both commands for a plan with neither, and is the only output of a command that existed before this change that changes, apart from `scenario rm` under `--force`. The Dashboard's contract accepts the fields as optional, so a Snapshot saved by an earlier build still parses (apps/web, `scenario-meta.test.ts`).

## Considered options

- **The main plan as the default `--scenario` of every read.** Rejected, above. It does not block a later opt-in; an agent that wants it reads `scenario list` and names the plan.
- **A `settings` table holding the main plan's id.** Rejected: a new record type in the interchange format and a new row count in every summary, for a value one column holds. A table would earn its place when a second ledger-wide setting needs one.
- **Notes in the Scenario document.** Rejected: the engine owns the document (ADR-0024) and the notes would move the hash.
- **A rename as `scenario fork` plus `scenario rm`.** Rejected: it makes a new id and a new history, and the old name is gone only when the second command succeeds.
- **A name length limit on `apply` and `fork` as well.** Not done: it would refuse a command that worked yesterday, for a rule that matters when a name is shown, which a rename is the occasion to say. A later change may move the limit to every writer.
- **Refusing `scenario rm` of the main plan with no way past it.** Rejected: a person who has decided to remove their main plan should be able to, and `--force` says so out loud.

## Consequences

`traj schema scenario rename`, `notes` and `main` list their flags (ADR-0054), and every example in their help runs in the tests (ADR-0043). `scenario_is_main` is a new error code. The notes of `scenario rename`, `notes`, `main`, `rm`, `fork`, `list` and `show` name 0.8.0.
