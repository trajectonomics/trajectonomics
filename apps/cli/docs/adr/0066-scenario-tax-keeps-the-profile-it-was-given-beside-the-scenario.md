# `scenario tax` keeps the profile it was given beside the Scenario, so it can be read back and changed one item at a time

`traj scenario tax` turned its flags into the plan's Levy and kept only the Levy. Nothing could say what the plan assumed: to change one allowance (a second child, a new policy) a caller had to state every flag again, and a person could not see what their plan took for granted (#399; the Dashboard's tax settings page is #400).

So the write keeps the profile. `scenario.tax` is a new nullable column holding the flags the write was given, normalised, as RFC 8785 canonical JSON, the way ADR-0048 keeps a household. The Scenario document stays `sim-core`'s and its only validator stays `check()` (ADR-0024). The Levy is still built by `@trajectonomics/core/tax`'s emitter and the CLI does no tax arithmetic.

## The stored profile

An object with the jurisdiction, filing status and both children counts always present (`tax`, `filingStatus`, `children`, `childrenAtHigherRate`, with the defaults the write applied), and each deduction (`parents`, `disabledCare`, `socialSecurity`, `lifeInsurance`, `healthInsurance`, `parentHealthInsurance`, `spouseLifeInsurance`, `mortgageInterest`, `donation2x`, `donation1x`) only when it is more than zero. Each key is the camelCase name of the flag that sets it, so `traj schema` already names the flag of each property (ADR-0054). A zero states nothing, so equal requests are equal text, and a later build that adds a deduction needs no rewrite of a stored row: an absent key reads as zero. `--label` is not part of it: labels live on the Flows in the document, where they already stay between writes.

The store schema moves to version 4 with `ALTER TABLE scenario ADD COLUMN tax TEXT`. No row is rewritten: a Scenario saved before it has no profile, which NULL states.

## The commands

- `scenario tax <name> --tax th-2026 <flags>` states the whole profile, as before, and stores it with the Levy. Whatever the flags leave out is the default, not what an earlier write stated.
- `--merge <flags>` lays the flags it carries over the stored profile and keeps every other item, so `--merge --children 2` changes only the children. A deduction stated as zero is taken out. `--merge` takes at least one profile flag. `--tax` beside it is allowed only when it names the stored jurisdiction; another one is refused at `--tax`, because a merge changes the profile it holds and a new jurisdiction states a new profile whole. The merged profile is checked as a whole write is, so `--merge --children 1` over a stored two children at the higher rate is refused at `--children-at-higher-rate`, and `--merge --children-at-higher-rate 2` over a stored three children is accepted, because the count is checked against the merged `children` and not the flags alone.
- `--from-stored` writes the Levy again from the stored profile and takes no profile flag. It is for a tax-year update: the core's emitter changes and the profile does not. When nothing changed, the write reports `unchanged` and the document is byte-identical.
- `--none` removes the Levy, the labels and the stored profile together.
- `--if-hash <contentHash>` and `--dry-run` work as on `scenario apply` (ADR-0055, ADR-0019). The hash check, the read of the stored profile and the write are one IMMEDIATE transaction, so `--merge` changes the profile it read and no other writer can move the plan between the check and the write. A stale hash is refused as `scenario_changed` before any refusal that reads the plan.
- `--merge` and `--from-stored` refuse a plan with no stored profile as `invalid_input` at the flag, and the hint names the whole form (`traj scenario tax <name> --tax th-2026 ...`). That covers a plan never taxed, a plan taxed before this change (a Levy and no profile), and a plan whose Levy was changed by hand since the profile was stored (the profile is cleared, below): building on its Levy would drop whatever it stated, so the caller states the profile once. The two flags cannot be combined, and neither joins `--none`.

`scenario show` prints `tax` (the stored profile, or `null`) and `taxed`, which is true when the document holds any Levy. A plan taxed before this change reads `tax: null, taxed: true`. `scenario list` prints `taxed` on each row. `scenario fork` copies the column, `scenario rm` removes it with the row, and `scenario tax` reports `unchanged` or `updated` over the document and the profile together (a plan taxed before this change that is written whole becomes `updated` although its document did not move, because it gains a profile).

## Why store the profile and not read it back from the Levy

Parsing the Levy back ties the CLI to the emitter's internal Measure layout, which changes with every tax-year update and is the core's, not ours (ADR-0032). The Levy is data emitted from the profile; the profile is one column and one rule.

## `apply` and the profile

`scenario apply` replaces the whole document (ADR-0032), and `scenario apply --set` and `scenario fork --set` change a field of it. The profile describes the Levy `th-2026-pit` the CLI wrote, so a write keeps it only while the written document's `th-2026-pit` Levy is canonically equal (RFC 8785, the form the content hash uses) to the stored document's, and clears it otherwise: when the Levy is gone, and also when it was changed. Keeping a profile beside a Levy that no longer matches it would let the next `--merge` or `--from-stored` silently put the Levy back to the profile and discard the hand edit. So an apply of an edited Levy (`--file`, or `--set levies.th-2026-pit...`) leaves a Scenario that holds a Levy and no profile, which `--merge` and `--from-stored` refuse, as they do a plan taxed before this change, and `scenario tax` with the whole form states the profile again. A write that does not touch the Levy (the household, the Flows, the economy, labels) keeps the profile, and so does a tax-year update: the emitter changing does not rewrite a stored document, so the stored Levy and the stored profile still agree. `scenario fork` follows the same rule against its source.

## What the content hash covers

The profile is not in the `contentHash`, as the household is not (ADR-0055). It does not need to be: the Levy in the document is a function of the profile, so every change of the profile that changes the tax changes the document and its hash, and `--if-hash` over it holds. The one case the hash does not see is a profile change that leaves the Levy as it was, which is a write the engine cannot tell from no write. A plan whose profile was never stored keeps the hash it had, because no document byte changes with this ADR.

## Considered options

- **Read the profile back from the Levy.** Rejected, above.
- **`--merge` as the default of `scenario tax`.** Rejected: today a call states the whole profile, and agents rely on it. `--merge` is the opt-in.
- **Put the profile in the Scenario document.** Rejected: `sim-core`'s Scenario is strict and holds a Levy, not a taxpayer, and ADR-0024 keeps the document the engine's alone.
- **`--merge` over no stored profile as a first write.** Rejected: one rule is easier to hold than two. The refusal costs a caller one call, and it stops a merge from silently dropping what a plan taxed before this change had stated.
- **A flag `--remove` beside `--none`.** Not added: the flag that removes a Levy is `--none` (ADR-0032), as it is for `scenario household`.

## Consequences

A backup written at schema version 3 restores with every `tax` null, and a schema 4 backup is refused by an older build (ADR-0038, ADR-0048). Export, backup and restore carry the column losslessly as canonical JSON, and a restored profile is checked by the same shape `scenario show` publishes, and is refused beside a document that holds no Levy. The web contract accepts `tax` and `taxed` on a show and `taxed` on a list; a Snapshot saved by an earlier build reads them as absent. The notes of `scenario tax`, `scenario show` and `scenario list` name 0.8.0.
