---
status: accepted
---

# The Dashboard edits Scenarios through traj on loopback

On 2026-11-22 the owner decided that the Dashboard edits plans. A person copies a plan, deletes one, or applies a Scenario document from the page, and the change is made the way every other figure is: `traj` does it, and the Dashboard shows what `traj` returns. [ADR 0001](0001-the-dashboard-renders-a-snapshot.md) said the Dashboard only read, and its read-only parts are superseded by this decision. Its Snapshot, and [ADR 0002](0002-the-cli-is-the-only-source-of-figures.md), stand: the page still computes no figure and writes no file.

## Decision

- **An Edit is a closed list.** `src/lib/edit/edit.ts` holds the union: `copy-plan` (`scenario fork`), `apply-plan` (`scenario apply --file - --decimal`, with the document on stdin, in the decimal form of [cli ADR 0047](../../../cli/docs/adr/0047-a-scenario-has-a-decimal-form-the-cli-converts-exactly.md)) and `delete-plan` (`scenario rm`). A pure function builds each one's argv, with and without `--dry-run`, and `edit.test.ts` pins the list and every argv, as `leaves.test.ts` pins the reads. The Plan that decides the reads stays read-only.
- **Every Edit is run in three steps.** The server runs the write with `--dry-run` first, so a refusal (a taken name, a missing plan) is answered before anything changes ([cli ADR 0019](../../../cli/docs/adr/0019-dry-run-executes-and-rolls-back.md)). If the dry run holds, the write runs for real, and then the Snapshot Plan runs again. The answer is the new Snapshot, or the CLI's error envelope as data.
- **The page gets a token, and only the page.** `GET /edit-session` answers `{"token": …}` after the Host check, with `Cache-Control: no-store` and no CORS header, so a foreign page cannot read it. The token is a random value made when the server starts. The page holds it in memory and sends it in the `x-traj-edit-token` header of every Edit.
- **`POST /edit` refuses, each refusal with its own test** (`src/lib/edit/guard.ts`, `scripts/serve-edit.test.ts`):
  - a Host other than this machine's, with 403;
  - an `Origin` other than `http://` plus the request's own loopback Host (`127.0.0.1`, `localhost` or `[::1]` on the server's port), a missing one included, with 403;
  - a plan name that starts with `-`, holds a control character or is over 100 characters, with 400 (`invalid_edit`): an Edit's argv puts the name before its flags and without `--`, so `--help` would be read as a flag, print help, write nothing and exit 0;
  - a missing or wrong token, with 403;
  - a `Content-Type` other than `application/json`, with 415;
  - an Edit before the first Snapshot is in, with 503;
  - a second Edit while one runs, with 409 (`scripts/edit.test.ts`).
  A body that names no Edit of the list is refused with 400 before anything runs.
- **Controls show only when the server answers.** The page shows Edit controls only when `/edit-session` gives a token, and never in the Demo snapshot. Under `bun run dashboard` (`vite preview`, no server) nothing answers, so the controls stay hidden.
- **A plan list the person chose follows the Edits.** `traj dashboard --scenario` names the plans it projects. A copy or an apply adds its name to that list, and a delete takes it out, so the new plan is shown. An empty list means every Scenario, and it stays empty.
- **The first controls are plan actions.** The plan switcher offers "Copy plan" (a name, then `copy-plan`, then the copy is shown) and "Delete plan" (a confirmation, then `delete-plan`).

## Considered Options

- **The page writes the ledger.** Rejected. The ledger's rules (the id scheme, the writer lock, the Scenario's content hash) are `traj`'s, and a second writer in the browser would drift from them.
- **Refuse every request but the page's own, with the Host check alone.** Rejected. The Host check stops DNS rebinding, but a page on any other website can still send a request to `127.0.0.1` from the same browser. A simple `text/plain` POST would run without a preflight, so the Content-Type rule, the Origin rule and the token each close a route on their own.
- **Let the browser post to a separate write command.** Rejected: a second process to start, and the same guards would be needed on it. The server `traj dashboard` already runs is the one place the page talks to.

## Consequences

- `traj dashboard` changes the ledger while it runs, so its CLI ADR records it ([cli ADR 0046](../../../cli/docs/adr/0046-traj-dashboard-edits-scenarios-on-loopback.md)). Its help text does not say so yet; that is a follow-up. Its other rules hold: loopback only, and no hosting.
- The `bun run dashboard` checkout preview has no server, so it cannot edit, and it says nothing about edits.
- An Edit re-runs the whole Snapshot Plan, so it takes as long as one Snapshot (several seconds on a large ledger). One Edit runs at a time, and the page disables its controls while it runs.
- The ledger's writer lock still decides a busy database: a write that meets it answers `database_busy` as data, as the CLI does.
- Every new Edit kind is a change to `src/lib/edit/edit.ts`, its pinned list, and this ADR's list.

## Amendment (2026-11-23): `traj` takes `--`, and the leading-`-` name rule stays

- This ADR first said `traj` has no `--`. That was wrong: every `scenario` write and read ends its flags at `--` (checked against the workspace binary: `scenario fork -- base -dash`, `scenario rm -- --help` and `scenario apply --file … -- -d2` each treat the name as a name), and the Snapshot's `scenario show` and the what-if's `projection compare` already pass the name after `--` (`stage-two-projections.ts`, `what-if/argv.ts`).
- The rule that a plan name never starts with `-` is **not redundant**, and it stays. `writeCommand` (`src/lib/edit/command.ts`) puts the name positionally, before `--json`, `--dry-run` and the override tokens, and passes no `--`. A name such as `--help` would be read as a flag there. Passing `--` would mean moving every name after the flags and re-pinning every argv in `edit.test.ts`, with no gain, since a plan named with a leading `-` is made only in a terminal.
- A plan the ledger holds under a name that starts with `-` can be read (reads name it after `--` or in `--scenario=`) but not edited from the page. If a later change puts `--` into the write argv, this rule can go with it.

## Amendment (2026-11-23): `apply-plan` has controls

- `apply-plan` carries `--decimal`. The page holds only decimal-form documents, so it never sees or makes minor units, and a saved document keeps its hash when nothing changed.
- The planner pages (Income, Expenses, and Assets and debts) are the controls for `apply-plan`. Each opens a right-side drawer, saves one change as one Edit, and closes when the Edit ran. A refusal stays in the drawer at the field it names.
- The Edit controls appear only when the server answers the token, and never in the Demo snapshot or under `vite preview`, as the plan actions do.
- Deleting an item is an `apply-plan` of the document without it, after a confirmation. It is not a new Edit kind.

## Amendment (2026-11-23): the household has controls

- `set-household` is `traj scenario household <name> --file -` with the household document on stdin, and `remove-household` is `traj scenario household <name> --none`. Each is one write, run with `--dry-run` first like every Edit, and its argv is pinned in `edit.test.ts`. Neither changes the plans the Snapshot projects, so `followPlan` returns the list as it was.
- The household card on the Overview (`/projection/`) is the control for both. Its person form saves the whole household with one person put in or taken out, and its anchor form saves one anchor, which replaces the one that pins the same path. Each refusal stays in its form at the field it names.
- The page computes no age and no date. Ages come from the rows and the `fi` answer, and an anchor's label ("at me, age 60") is the stored anchor's text. An anchored start or end is disabled in the Flow form, with a link to the household card, because `traj` would refuse a different date there (cli ADR-0048).
- The household controls appear only when the server answers the token, and never in the Demo snapshot or under `vite preview`, as the other Edit controls do.

## Amendment (2026-11-23): an Edit names the plan it read

- `apply-plan`, `set-household` and `remove-household` carry `contentHash`: the `contentHash` the Snapshot states for that plan (`reads.documents.<name>.scenario.contentHash`), taken from the same read as the document or household the form edits. `writeCommand` adds `--if-hash <contentHash>` to each of their argv, with and without `--dry-run`, and `edit.test.ts` pins it ([cli ADR 0055](../../../cli/docs/adr/0055-a-write-can-name-the-content-hash-it-read.md)). `copy-plan` and `delete-plan` carry no hash.
- A write the CLI refuses as `scenario_changed` shows "This plan changed since the page read it." with a Reload action, and no form repeats the CLI's text. Reload asks the server to read the Snapshot again (`POST /reread`), and the form keeps what the person typed. The form then saves against the new document and hash. The `/reread` route runs the Edit guards (Host, Origin, token, `application/json`, no Edit running), reads the Snapshot and writes nothing.
- An Edit to a plan the page did not read is refused, so the page no longer creates a plan through `apply-plan`.
- Known gap: the hash covers the document only (cli ADR 0055). A household change that moves no anchored date is not seen by a stale household save until the hash covers the household too.
- Tests: `edit-stale.test.ts` runs a terminal change (`traj scenario tax base --none`, then a salary change) against the real binary, then a page save: it is refused and the stored plan is unchanged; after a reread the same Edit succeeds. `serve-edit.test.ts` pins the `/reread` refusals.

## Amendment (2026-11-23): the what-if Edits

- `copy-plan` gains optional `sets` and `removals`, the Overrides of a what-if. With them it runs `scenario fork <from> <name> --set=… --without=… --decimal`; without them its argv is unchanged.
- `apply-overrides` is new: `scenario apply <name> --set=… --without=… --decimal --if-hash <contentHash>`, the what-if form of `scenario apply` ([cli ADR 0057](../../../cli/docs/adr/0057-a-what-if-applies-to-the-plan-it-came-from.md)). It carries at least one change, and it names the hash the session began with.
- Both are pinned in `edit-what-if.test.ts`, and `followPlan` joins a copy or an apply to the plans the Snapshot projects, as `apply-plan` does. The session that makes them is [web ADR 0010](0010-the-what-if-session-reads-through-traj-on-loopback.md).

## Amendment (2026-11-23): a reread can carry the allowance inputs

- `POST /reread` takes `{}` as before, or `{ "allowances": <inputs or null> }`: the labels in order, the step and the two optional limits of the Tax allowances page ([ADR 0012](0012-the-tax-allowances-page-reads-what-traj-says-each-allowance-could-take.md)). The server keeps them with the Snapshot's parameters and reads again. It still writes nothing; the body is a strict schema with the depth cap, and a body that is not that shape is a 400 `invalid_reread`. The other guards are the Edit guards, unchanged.

## Amendment (2026-11-24): the tax profile Edits

- `merge-tax`, `set-tax` and `remove-tax` are `traj scenario tax <name> --merge <flags>`, `--tax th-2026 <flags>` and `--none`, each with `--if-hash`, run dry first. The flags are a closed, strict set whose values are digits only, so none is read as a flag. See [ADR 0016](0016-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md).
- `set-tax` also takes `labels`, a list of `{ flow, label }` that becomes one `--label=<flow>=<label>` token each, after the profile flags. A label is one of the income labels `traj` lists. A Flow id is 1 to 256 characters with no `=` (`traj` splits a label on the first one) and no control character, so it can be any id the page makes, Thai script and punctuation included. The pair is a single token, so an id that starts with `-` can never be read as a flag; `merge-tax` takes none.

## Amendment (2026-11-25): the first write to the ledger itself, `record-values`

- **The closed list gains `record-values`, the first Edit that writes Transactions and not a Scenario.** It is `traj account value --file - --json` with `{ against, values: [{ account, date, value }] }` on stdin ([cli ADR 0072](../../../cli/docs/adr/0072-a-valuation-is-a-transaction-the-cli-computes-against-an-account-the-caller-names.md)), run in the three steps above: dry run, write, new Snapshot. `edit.test.ts` pins its argv, and `scripts/record-values.test.ts` runs it against the workspace `traj`.
- **Why it goes through `traj`, and not the page.** This is the first rejected option of this ADR, and it now has a case to hold against: a value is a Transaction the CLI computes from the Balance at a date (the difference, the side a liability is stated on, the later valuations the write moves), and the page may do no money arithmetic ([ADR 0002](0002-the-cli-is-the-only-source-of-figures.md)). So the page sends each value as typed text, and `traj` parses it, computes every difference, and writes them all in one transaction or none.
- **A strict, bounded body.** The schema takes `against` and one to 200 rows of `account`, `date` (`YYYY-MM-DD`, a real day) and `value` (text, 1 to 40 characters), and nothing else. The ids go in the document on stdin and never in the argv, so none can be read as a flag. The server also refuses, with 400 `invalid_edit` and before anything runs, an `against` or an `account` that the Snapshot's chart of accounts does not hold. Values are sent as typed, with only the spaces around them taken off.
- **The answer carries the CLI's result.** The Edit answer gains an optional `result`: for this Edit, the batch exactly as `traj` stated it (`before`, `value`, `difference`, `status` and `notes` per row, in the order `traj` applied them). After a save the sheet shows `before → value` and the difference from it, and does no arithmetic. The Snapshot answered with it is read again after the write, so net worth on the page is the CLI's.
- **A refusal is shown on its row.** Any refusal rolls the whole batch back and writes nothing. The CLI lists every refused entry in `details.values`, each with the `index` of its row in the batch the page sent, so the page puts each message on the row that index names. A refused `against` (`document.against`) is shown at that field, and any other error on the sheet.
- **The control.** "Record today's values" on the Net worth page opens a drawer (the whole screen on a phone) with one row per open asset and liability Leaf Account, grouped as cash, investments, property and things, other assets and debts. The chart of accounts has no kind below asset, so the group is read from the words of the account's name and its parents' names; an asset that matches none is under "Other assets". A debt's field asks for what is still owed, as a positive number, because `traj` refuses a negative one. The last Transaction date is the latest one in the transactions the Snapshot loads (the last two months and a bit), and a row with none says "No transaction since" that first date.
- **"Count against" is kept for the session only.** The person chooses the income or equity Leaf Account once, from the ledger's own accounts. The page keeps the choice in memory for the life of the tab (`src/client/record-values.svelte.ts`) and shows it in the sheet's footer; it is not stored and is not a parameter of the Snapshot, so a reload or a restarted Dashboard asks again, as it forgets its other parameters. With no eligible account the sheet shows the exact `traj account add` command and saves nothing.
- **Shown only where an Edit is.** Never in the Demo snapshot, and hidden when `/edit-session` gives no token, as every control above.
- **Later work.** Importing a balance history ([#403](https://github.com/trajectonomics/trajectonomics/issues/403)) can add `preview: true` to this Edit, which runs only the dry run and answers its result; the server's run (`scripts/serve-record-values.ts`) is one function with the dry run as its first step, so that is a small addition.
- **Consequences.** `traj dashboard` now changes the ledger's Transactions as well as its Scenarios, which [cli ADR 0046](../../../cli/docs/adr/0046-traj-dashboard-edits-scenarios-on-loopback.md) did not say. The ledger's writer lock still decides a busy database, and the answer is `database_busy` as data.
