# `scenario show` states which tax allowances the plan states and which it does not

`scenario tax` prints `allowances: { stated, notStated }` for the profile it wrote (ADR-0036), but only the write does, and a dry run of a write is not a read the Dashboard may run. The Dashboard's Settings > Tax page lists the classes a plan leaves out ("Not in your plan yet"), so it worked the list out itself, a second copy of the rule that agreed with the CLI until the tax core added a contribution label (#450, web ADR 0016).

## Decision

`scenario show` gains `taxAllowances: { stated, notStated }`, in `--json` and in the human form, on a plan that is taxed and keeps a profile. It is computed by `taxProfileOf(requestOfStored(stored profile), document)`, the function `scenario tax` reports `allowances` with, so one rule answers both. The classes and their order are `TAX_ALLOWANCE_CLASSES`, and `traj schema scenario show` describes the field with the same enum.

- **The document is the stored one.** `scenario tax` reads the Levy it has just built; `show` reads the Levy the plan holds. They are equal while the profile is stored (ADR-0066 clears the profile when the Levy is changed by hand), so `show` equals `scenario tax --from-stored --dry-run` for every plan with a stored profile, which `src/scenario-show-tax-allowances.test.ts` pins for plans with and without RMF and ThaiESG contribution Flows, children, parents and insurance. After a tax-year update of the core's emitter the two can differ until `--from-stored` is run: `show` says what the plan holds now, the dry run says what it would hold.
- **Absent, not empty.** An untaxed plan has no field, and the rest of its output is byte-identical. A plan that holds a Levy and no stored profile (taxed before profiles were kept, or its Levy changed by hand since) has none either: the flags that wrote a Levy cannot be read back from it, and an empty `stated` would claim nothing was stated.
- **It states what the plan was told, not what the tax applied.** The same caveat as `allowances` on `scenario tax` (ADR-0036): eligibility and ceilings stay with the core.
- `--decimal` changes no figure of it: it holds class names only.

## Considered options

- **Compute it on the Dashboard** (what #449 did). Rejected: a second copy of the rule drifts silently.
- **A new leaf, `scenario tax --show`.** Rejected: `scenario show` already carries `tax` and `taxed`, is in the Dashboard's Snapshot and is a read; one more leaf would be one more call per plan.
- **Fill the field from `taxed` alone for a plan with no profile.** Rejected, as above.

## Consequences

The web contract decodes `taxAllowances` as optional, and Settings > Tax lists `notStated` from it (web ADR 0016, amended). A Snapshot saved by an earlier build has no field, and the page then lists nothing. The notes of `scenario show` name 0.8.0.
