---
status: accepted
---

# A What-if session is transient Overrides that the server reads through `traj`

A person asks "what if I stop the gym, or earn 10% more?" without changing the plan, sees the answer, and then keeps it as a new plan, applies it to the plan it came from, or drops it. The answer comes from `traj`, as every figure does ([ADR 0002](0002-the-cli-is-the-only-source-of-figures.md)). The CLI applies a what-if transiently with its Overrides ([cli ADR 0056](../../../cli/docs/adr/0056-a-what-if-takes-a-list-item-out-and-reads-its-amounts-in-major-units.md)), so the page holds the changes and asks for the reads.

## Decision

- **The session is in the tab.** A What-if session belongs to one plan. It holds that plan's name, the content hash the page read when the session began, the Sets (`path` and the JSON value that replaces it) and the Removals (the item ids switched off). It lives in `src/client/what-if-state.svelte.ts` and the session module in `src/lib/what-if/`. Nothing is stored: closing the tab ends it.
- **`POST /what-if` reads; it writes nothing.** It is one more route on the loopback server (`scripts/serve-edit.ts`, `scripts/serve-what-if.ts`) and runs four read leaves with the Overrides: `projection run`, `fi`, `projection compare` and, when the Snapshot states a Return model, `projection chance`. Each takes its Overrides as `--without=<path>` and `--set=<path>=<json>` tokens, with `--decimal`, and the argv is built by a pure function (`src/lib/what-if/argv.ts`) that `argv.test.ts` pins. Every argv is a read leaf of the Snapshot allowlist.
- **The guards are the Edit guards.** Host, an Origin equal to that Host, the session token compared in constant time, `application/json`, the 1 MiB body cap and one request at a time. A what-if and an Edit share the busy flag, so either one refused while the other runs answers 409. The body is a closed, strict schema (`src/lib/what-if/overrides.ts`): a plan and its Sets and Removals, with the name rules of an Edit, so no path or id can be read as a flag. Each refusal has its test in `scripts/serve-what-if.test.ts`, and the 1 MiB cap is checked through the real server in `scripts/serve-what-if-server.test.ts`.
- **Each read answers as data.** The answer is the four Reads, each with its argv and its data or its error envelope. A read the CLI refuses (a Set on a path the plan does not hold, a removal a `derive` graph reads) is an error at its own key, and the session is kept. The bar shows the refusal at the change its `details.path` names.
- **Keeping the session is an Edit.** *Save as new plan* is `copy-plan` with its Sets and Removals, which runs `scenario fork <from> <name> --set=… --without=… --decimal` ([cli ADR 0056](../../../cli/docs/adr/0056-a-what-if-takes-a-list-item-out-and-reads-its-amounts-in-major-units.md)). *Apply to this plan* is `apply-overrides`, which runs `scenario apply <name> --set=… --without=… --decimal --if-hash <hash the session began with>` ([cli ADR 0057](../../../cli/docs/adr/0057-a-what-if-applies-to-the-plan-it-came-from.md)). Both are Edits, so they run `--dry-run` first and then read the Snapshot again ([ADR 0008](0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)). A plan that moved on is refused as `scenario_changed`, and the session is kept, with a Reload that takes the new hash.
- **Revert runs nothing.** It drops the session.
- **Controls show only with the server.** The switches, the *Try a value* actions and the session bar appear only when the server answers the token, and never in the Demo snapshot or under `vite preview`.

## Considered Options

- **A scratch plan in the ledger.** Rejected. Each what-if would be a write the person never asked for, and it would show in `scenario list`. A read with Overrides writes nothing and needs no cleanup.
- **Apply the Overrides in the browser and send the document.** Rejected. The Override grammar of [cli ADR 0024](../../../cli/docs/adr/0024-scenario-documents-and-overrides.md) would be rebuilt in the page, and it would drift from `traj`. `scenario apply --set/--without` applies the same function `projection run` does.
- **Persist the session in the address or in storage.** Rejected for now. A session is one tab's changes, and the issue asks for no link to it.

## Consequences

- The session's reads are never saved to the Snapshot file, and the answer is sent with `Cache-Control: no-store`.
- The page computes no figure. It shows the CLI's values as they come, and the figures of a what-if are shown on the figure pages in a later change ([#275](https://github.com/trajectonomics/trajectonomics/issues/275)).
- `POST /what-if` is part of the `traj dashboard` binary, so it ships in a CLI release ([cli ADR 0046](../../../cli/docs/adr/0046-traj-dashboard-edits-scenarios-on-loopback.md), amended).
