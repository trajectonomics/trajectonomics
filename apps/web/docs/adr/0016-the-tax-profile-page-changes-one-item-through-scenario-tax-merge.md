---
status: accepted
---

# The Tax profile page changes one item through `scenario tax --merge`

A person who wants a second child counted should not have to state the whole tax profile again. `traj` keeps the profile a plan was taxed with beside the plan and changes one item of it ([cli ADR 0066](../../../cli/docs/adr/0066-scenario-tax-keeps-the-profile-it-was-given-beside-the-scenario.md)). The page, in a new Settings group, shows that profile and sends the change. Every figure is the CLI's ([ADR 0002](0002-the-cli-is-the-only-source-of-figures.md)); what the page shows is the person's own input, and no allowance, limit or rate is named in it.

## Decision

- **Read.** No new read. `scenario show` of each plan, already in the Snapshot, carries `tax` (the stored profile or null) and `taxed` (the document holds a Levy). A Snapshot saved before them states neither, so `tax` reads as null and `taxed` reads from the document's Levies. The Demo is unchanged: it has no profile, so it shows the plan as taxed with no stored profile and no controls.
- **The page.** `/settings/tax/`, "Tax profile" in a "Settings" group after Records, listed when the plan has a document. The title is not "Tax", which the report page already is. It says the tax is Thai personal income tax for the 2026 tax year, that a contribution to an SSF is not deductible from 2025, that the Flows taxed are the ones that carry a tax label and that this page does not change those labels. A plan with no profile and no Levy shows nothing filled in; one with a Levy and no stored profile (taxed before profiles were kept, or its tax rules changed by hand since) says so.
- **Three Edits** (`merge-tax`, `set-tax`, `remove-tax`), each one `scenario tax` write that names the hash the page read ([ADR 0008](0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)), run dry first like every Edit:
  - `merge-tax` is `scenario tax <name> --merge <flags> --if-hash <hash>`. The form sends only the items whose text differs from the stored one; an amount emptied is sent as `0`, which takes it out; a count of children cannot be emptied. It needs at least one flag, and the schema refuses an empty merge.
  - `set-tax` is `scenario tax <name> --tax th-2026 <flags> --if-hash <hash>`, the whole profile. The filing status is chosen, never assumed: the form starts with it unchosen and the schema requires it. An item left empty is none, and the form says anything an earlier write stated and the person leaves out is dropped.
  - `remove-tax` is `scenario tax <name> --none --if-hash <hash>`, not `--remove`, after a confirmation that says the tax rules, the stored profile and the tax labels on the Flows go with it.
- **Values are text shaped for `traj`.** The Edit carries each count as whole digits and each amount as digits with at most two decimals, so no value can be read as a flag. `traj` parses and range-checks every one, and the page does no arithmetic (`src/lib/edit/tax-flags.ts`, pinned in `tax-edit.test.ts`).
- **Merge or whole.** A stored profile is changed one item at a time, and the form can switch to stating the whole profile, which clears it. A plan with no stored profile goes straight to the whole form, because `--merge` would refuse. A merge the CLI still refuses for want of a profile (its path is `--merge`) shows its message and a "Set the whole profile" action.
- **Refusals** land at their field in the CLI's own words. `scenario tax` names the flag in its path (`--children-at-higher-rate`), which maps to the form field of the same name; a `--merge` of fewer children than the stored higher-rate count is therefore refused at the higher-rate field, because the CLI checks the merged profile. A path that names no field (`--tax`, `--if-hash`) is shown for the whole form. A stale page is refused as `scenario_changed`, with "This plan changed since the page read it." and Reload.
- **A plan moves under the form.** The form is made again whenever the plan's hash changes, from the profile stored then, and says so ("the plan changed since you opened this form"); a Reload therefore never carries an old value over an item someone else changed, and a profile that is no longer stored gives the whole form with nothing in it. A merge also sends only the items that differ from the profile the form opened with, so an item changed elsewhere is never rewritten by a save that did not touch it.
- **Income Flows with no tax label.** `scenario tax` refuses a plan while an income Flow has no tax label, and `--none` clears every label, so a plan with such a Flow (an untaxed plan with any income Flow, or a plan such as the Demo's `base`) cannot be set or merged from this page, which does not set labels. The page then names those Flows and the command that labels them (`traj scenario tax <name> --merge --label <flow>=<label>` with a stored profile, `--tax th-2026 --label <flow>=<label>` without) instead of offering the form. A label that is present counts as set: the closed list is `traj`'s, and a wrong one is refused. The Remove confirmation says that putting tax back needs that command, and a `document` refusal that lists Flows is shown as a sentence naming them. Removing tax stays available.
- **The controls** appear only when the server answers the token, and never in the Demo snapshot, as every Edit control does. `followPlan` leaves the plan list as it was.

## Considered Options

- **A merge for every change, whole only for a first write.** Rejected: a plan taxed before profiles were kept, or one whose tax rules were changed by hand, has no stored profile, and its merge is refused. The page offers the whole form there instead of failing.
- **Sending the whole profile for every change.** Rejected: the page would restate items it did not change, and `--merge` exists to avoid exactly that.
- **A default filing status of `single`.** Rejected, as no share, rate or relation is defaulted elsewhere in the page: the person chooses.
- **Adding a Tax profile read to the Snapshot.** Rejected: `scenario show` has it, and the Demo is at 99.3% of Biome's 1 MiB limit.

## Consequences

- A change in the CLI's output fails `src/lib/contract/` and `scripts/contract.test.ts` as before; the Edits' argv is pinned in `src/lib/edit/tax-edit.test.ts`.
- `scripts/tax-settings.test.ts` runs a whole set, a merge that keeps the other items, a deduction stated as zero, a merged-profile refusal at its field, `--none` followed by a merge refused with the whole form named, and a stale save, all against the real binary; `scripts/tax-labels.test.ts` adds a save from a form opened before someone else's change (kept after a Reload), a plan with an unlabelled income Flow (the refusal names the Flow), and the label command followed by a merge and a Remove.
- A `traj` older than `scenario tax --merge` refuses the flag; the CLI the Dashboard ships with has it.
