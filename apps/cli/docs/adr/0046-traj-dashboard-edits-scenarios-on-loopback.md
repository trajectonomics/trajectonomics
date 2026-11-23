# `traj dashboard` edits Scenarios through traj on loopback

[ADR-0041](0041-traj-dashboard-serves-the-dashboard-on-loopback.md) made `traj dashboard` a server that only reads: it answered GET and HEAD, and it ran read leaves and nothing else. On 2026-11-22 the owner decided that the Dashboard edits plans, and every edit goes through `traj`. So the server now accepts writes from its own page, and each one runs a `traj` write. The Dashboard's record is `apps/web` [ADR 0008](../../../web/docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md).

The server answers three routes it did not answer before. `GET /edit-session` gives the page a token, to this machine's Host only, never cached and never readable across origins. `POST /edit` runs one Edit: a copy of a plan (`scenario fork`), an applied Scenario document (`scenario apply --file -`), or a deleted plan (`scenario rm`). Each runs first with `--dry-run` ([ADR-0019](0019-dry-run-executes-and-rolls-back.md)), then for real, and then the Snapshot is read again. The answer is the new Snapshot, or the error envelope the CLI printed, as data. Every other request is answered as before.

## What a request must hold

Each refusal has its own test in `apps/web/scripts/serve-edit.test.ts`:

- a Host other than `127.0.0.1`, `localhost` or `[::1]` on the server's port: 403;
- an `Origin` other than `http://` plus the request's own loopback Host (`127.0.0.1`, `localhost` or `[::1]` on the server's port), a missing one included: 403;
- a plan name that starts with `-`, holds a control character or is over 100 characters: 400, because an Edit's argv puts the name before its flags and without `--` (`traj` does take `--`), so `traj` would read `--help` as a flag, print help, write nothing and exit 0;
- a missing or wrong `x-traj-edit-token` header: 403. The token is random, made when the server starts, and given only to a page that asks for it from this machine;
- a `Content-Type` other than `application/json`: 415. A cross-site form or a simple request cannot send that type without a preflight, and no preflight is answered;
- an Edit before the first Snapshot is read: 503;
- a second Edit while one runs: 409, which `apps/web/scripts/edit.test.ts` runs against the workspace `traj`.

## Considered options

- **A second command that writes.** Rejected: another process to start and to guard, and the page already talks to this one.
- **Read-only, and the owner's plan edits in the terminal.** Rejected: the owner decided the page edits plans, and a page that only shows them asks the person to switch windows for each change.
- **The Host check alone.** Rejected. It stops DNS rebinding, but another website open in the same browser can still send a request to `127.0.0.1`, so the Origin, the token and the Content-Type each close a route of their own.

## Consequences

- `traj dashboard` changes the ledger while it runs. Its result still lists the reads, and it does not list the Edits: they are answered to the page that made them, and the ledger keeps the record like any other write.
- An Edit takes the writer lock as any write does, so a busy database answers `database_busy` (exit 5) as data, and the page shows it.
- The binary grows by the Edit list and its guards, which is small. Its pages come from `apps/web` as before.
- The Dashboard's `bun run dashboard` checkout preview still has no server, so it has no edits.
- `scripts/smoke.sh` checks reads only, as before. An Edit is checked by the end-to-end test in `apps/web`, which runs the workspace `traj`.
- The help for `traj dashboard` still says it serves the Dashboard on loopback until Ctrl-C. It does not yet say that the page can change plans. That wording is a follow-up with the Docs Portal release.

## Amendment (2026-11-23): a fourth route re-reads the Snapshot

- `POST /reread` runs the same guards as `POST /edit` (Host, Origin, token, `application/json`, a Snapshot already read, no Edit running). It runs the Snapshot Plan again and answers the new Snapshot, or the error as data. It writes nothing, and it exists so the page can show a plan that changed elsewhere, after a `scenario_changed` refusal ([cli ADR 0055](0055-a-write-can-name-the-content-hash-it-read.md), [web ADR 0008](../../../web/docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
- The plan-changing Edits send `--if-hash` with the hash the page read, so a save over a plan another writer changed is refused and nothing is written.

## Amendment (2026-11-23): a fifth route reads a what-if

- `POST /what-if` reads four figures for a what-if: `projection run`, `fi`, `projection compare` and, when the plan states a Return model, `projection chance`, each with the what-if's `--set`, `--without` and `--decimal`. It writes nothing, and each read is a read leaf of the Snapshot allowlist. It holds the guards of `POST /edit` (Host, Origin, the token compared in constant time, `application/json`, the 1 MiB body cap, and no Edit or what-if running: 409 for either). Its refusals are tested in `apps/web/scripts/serve-what-if.test.ts`, and its real-server body cap in `apps/web/scripts/serve-what-if-server.test.ts`. The Dashboard's record is [web ADR 0009](../../../web/docs/adr/0009-the-what-if-session-reads-through-traj-on-loopback.md).
- The answer is the four reads as the Snapshot holds them, or the error envelope of a refused request. It is never saved to the Snapshot file.
