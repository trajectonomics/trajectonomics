# Help and refusals point to the document and say what is allowed, and a result says what it dropped

The 0.7.0 validation run (#55) gave three agents only `traj --help`, `traj help` and `traj schema`. None ran
`traj schema scenario apply`, so 75 `--dry-run` applies went to finding by trial what the schema states
(#256). The CLI's job under G1 is that the text it prints is enough, so this ADR fixes where each answer lives.
Every change is additive to the `--json` envelopes.

## Decision

- **The schema is discoverable.** `scenario apply --file` names `traj schema scenario apply`. The bare
  `traj schema` result opens with a `usage` line: `traj schema <command> prints a command's flags and the
  document it reads.` Every Scenario document refusal carries the schema hint, not only
  `UNSUPPORTED_SCHEMA_VERSION`.
- **A closed-list refusal names the values**, in the words ADR-0013's `choice` sentence gives a closed flag: `path: CODE (one of: a, b)`.
  The lists are `sim-core`'s own, read through `allowedValues(code, path)`, which `sim` exports from the
  vocabulary `check()` tests against, so the CLI restates none of them (AGENTS rule 3). `INVALID_GROWTH` names
  its two forms, and `NOT_SAFE_INTEGER` on a rate adds `basis points, a whole number: 2% is 200`.
- **The horizon is a choice, and says so.** `fi` describes `--horizon` as the last date the plan has to fund
  (the age-95 date), and its result carries a note naming the horizon the answer is for.
- **A result says what a write dropped or a figure used.** `scenario apply` carries `notes`, which names a Levy
  the stored Scenario held and the new document does not ("would be removed" under `--dry-run`). Each `taxYears` row carries `taxableIncome` and
  `progressiveTax` from the Levy's own Measures, and a note when `tax.regular` exceeds `tax.progressive`, which
  is the Section 48(2) minimum tax being the larger and so charged.
- **Smaller texts.** `scenario tax --label` says a label replaces that Flow's label and adds to the others, and
  that `--none` clears them. `--carry-in` states decimal THB strings, not satang, the period before `--as-of`,
  and refuses a number with that form named. The `target` and `cashflow.contribute` descriptions, and the
  unfunded-Contribution note, say in one wording that an asset Contribution is capped by that day's income minus the tax prepaid, expenses, debt payments and tax settled that day.
  The document description shows a one-off what-if as a `once` Contribution to a liability.

## Left as it was

- The 2026 note does not state the projected gross beside the carry-in gross (item 7 of #256, a suggestion).
- `scenario tax --label` has no way to remove one label: the help states how a label behaves instead.
