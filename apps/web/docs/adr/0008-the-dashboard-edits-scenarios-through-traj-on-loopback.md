---
status: accepted
---

# The Dashboard edits Scenarios through traj on loopback

On 2026-11-22 the owner decided that the Dashboard edits plans. A person copies a plan, deletes one, or applies a Scenario document from the page, and the change is made the way every other figure is: `traj` does it, and the Dashboard shows what `traj` returns. [ADR 0001](0001-the-dashboard-renders-a-snapshot.md) said the Dashboard only read, and its read-only parts are superseded by this decision. Its Snapshot, and [ADR 0002](0002-the-cli-is-the-only-source-of-figures.md), stand: the page still computes no figure and writes no file.

## Decision

- **An Edit is a closed list.** `src/lib/edit/edit.ts` holds the union: `copy-plan` (`scenario fork`), `apply-plan` (`scenario apply --file -`, with the document on stdin) and `delete-plan` (`scenario rm`). A pure function builds each one's argv, with and without `--dry-run`, and `edit.test.ts` pins the list and every argv, as `leaves.test.ts` pins the reads. The Plan that decides the reads stays read-only.
- **Every Edit is run in three steps.** The server runs the write with `--dry-run` first, so a refusal (a taken name, a missing plan) is answered before anything changes ([cli ADR 0019](../../../cli/docs/adr/0019-dry-run-executes-and-rolls-back.md)). If the dry run holds, the write runs for real, and then the Snapshot Plan runs again. The answer is the new Snapshot, or the CLI's error envelope as data.
- **The page gets a token, and only the page.** `GET /edit-session` answers `{"token": …}` after the Host check, with `Cache-Control: no-store` and no CORS header, so a foreign page cannot read it. The token is a random value made when the server starts. The page holds it in memory and sends it in the `x-traj-edit-token` header of every Edit.
- **`POST /edit` refuses, each refusal with its own test** (`src/lib/edit/guard.ts`, `scripts/serve-edit.test.ts`):
  - a Host other than this machine's, with 403;
  - an `Origin` other than `http://` plus the request's own loopback Host (`127.0.0.1`, `localhost` or `[::1]` on the server's port), a missing one included, with 403;
  - a plan name that starts with `-`, holds a control character or is over 100 characters, with 400 (`invalid_edit`): `traj` has no `--`, so `--help` would be read as a flag, print help, write nothing and exit 0;
  - a missing or wrong token, with 403;
  - a `Content-Type` other than `application/json`, with 415;
  - an Edit before the first Snapshot is in, with 503;
  - a second Edit while one runs, with 409 (`scripts/edit.test.ts`).
  A body that names no Edit of the list is refused with 400 before anything runs.
- **Controls show only when the server answers.** The page shows Edit controls only when `/edit-session` gives a token, and never in the Demo snapshot. Under `bun run dashboard` (`vite preview`, no server) nothing answers, so the controls stay hidden.
- **A plan list the person chose follows the Edits.** `traj dashboard --scenario` names the plans it projects. A copy or an apply adds its name to that list, and a delete takes it out, so the new plan is shown. An empty list means every Scenario, and it stays empty.
- **The first controls are plan actions.** The plan switcher offers "Copy plan" (a name, then `copy-plan`, then the copy is shown) and "Delete plan" (a confirmation, then `delete-plan`). `apply-plan` is in the list and on the server, with no control yet.

## Considered Options

- **The page writes the ledger.** Rejected. The ledger's rules (the id scheme, the writer lock, the Scenario's content hash) are `traj`'s, and a second writer in the browser would drift from them.
- **Refuse every request but the page's own, with the Host check alone.** Rejected. The Host check stops DNS rebinding, but a page on any other website can still send a request to `127.0.0.1` from the same browser. A simple `text/plain` POST would run without a preflight, so the Content-Type rule, the Origin rule and the token each close a route on their own.
- **Let the browser post to a separate write command.** Rejected: a second process to start, and the same guards would be needed on it. The server `traj dashboard` already runs is the one place the page talks to.

## Consequences

- `traj dashboard` changes the ledger while it runs, so its CLI ADR records it ([cli ADR 0046](../../../cli/docs/adr/0046-traj-dashboard-edits-scenarios-on-loopback.md)). Its help text does not say so yet; that is a follow-up. Its other rules hold: loopback only, and no hosting.
- The `bun run dashboard` checkout preview has no server, so it cannot edit, and it says nothing about edits.
- An Edit re-runs the whole Snapshot Plan, so it takes as long as one Snapshot (several seconds on a large ledger). One Edit runs at a time, and the page disables its controls while it runs.
- The ledger's writer lock still decides a busy database: a write that meets it answers `database_busy` as data, as the CLI does.
- Every new Edit kind is a change to `src/lib/edit/edit.ts`, its pinned list, and this ADR's list. A control for `apply-plan` is a follow-up.
