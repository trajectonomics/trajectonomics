---
status: superseded in part by 0008 (the read-only parts)
---

# The Dashboard renders a Snapshot

The Dashboard shows what `traj` computed. [ADR 0008](0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md) supersedes its read-only parts: the Dashboard now also sends Edits, each a `traj` write, through its server. A script runs read leaves of the CLI (`traj … --json`), keeps each result verbatim with the argv that produced it, and writes one JSON document, the Snapshot. The Dashboard is static pages and React islands that render that one file and nothing else.

The Snapshot is version 1 and is closed: a field it does not name is not in it. Each Read is either the parsed data of a successful call or the error envelope of a failed one. A page shows an error only where it needs the failed Read, so one missing figure does not blank the others.

The plan that decides which argv to run is pure. It takes the parameters (the As-of, the horizon, the Scenarios to project, and the rest) and returns argv lists. A separate runner spawns `traj` and parses each stdout against the leaf's schema. Every date comes from the caller, as the CLI requires ([cli ADR 0029](../../../cli/docs/adr/0029-reads-take-their-date-from-the-caller.md)).

## Considered Options

- **A server that calls `traj` on each page view.** Rejected. It would be a second process to run and to keep alive, and it would put a clock on the page. A Snapshot is a file the user can read, keep and compare.
- **Let the page call the CLI directly.** Rejected. A browser cannot spawn a local binary, and the page would then need a rule for every error.

## Consequences

- Re-running the Dashboard means writing a new Snapshot. Nothing refreshes by itself.
- Every figure on screen can show the argv that produced it, the As-of and the Scenario's content hash.
- A new CLI output shape fails the contract test in `scripts/contract.test.ts` before any page breaks.

## Amendment (2026-11-25): a word list the page only shows is a plain string

- The contract does not copy a CLI vocabulary the page only displays. `compounding`, a payout's `frequency` and `rounding`, a fee's `rounding` and an estate line's `rounding` are `z.string()` in `src/lib/contract/scenario-show.ts`, as a loan's `level.rounding` already was (#515). A word the CLI adds later still decodes, a card or a sentence shows it as the CLI states it, and a form that opens on it holds it as it is.
- The contract keeps a closed `z.enum` only where a page branches on the value: a Flow's `kind` and `frequency`, and an Account's `kind`. A word the CLI adds there must reach the pages, so `scripts/contract-vocabularies.test.ts` reads the allowed words from the built `traj schema "scenario apply" --json` and fails when the contract's list differs. It also fails when a list a form offers (`FREQUENCIES`, the compoundings and roundings) holds a word the CLI no longer accepts. `scripts/vocabulary.ts` holds the comparison, and `scripts/vocabulary.test.ts` shows it fails for a word added and a word removed.
- The test keeps no copy of the CLI's lists. Without this rule a CLI that adds a word fails the whole Snapshot read as `contract_mismatch` (#318, #336, #542).
