# A Levy tallies the Filers of one Return through Filer labels

Status: Proposed (trajectonomics/trajectonomics#343).

## Context

`emitThLevy` models one Return over fixed Tally labels (`levy/labels.ts`, `levy/tallies.ts`). Two Levies emitted from it would both tally every Flow, so a couple who file separately cannot be modelled. Under s.57 sexies each spouse files a Return for their own income, and income that cannot be attributed counts as half each ([research](../research/separate-filing.md#the-rule-s57-sexies-มาตรา-57-ฉ)).

A joint Return is not simply one Filer either. s.42 bis para 2 gives each spouse their own 50% standard expense, capped at 100,000, for s.40(1)–(2) income, even on a joint Return. Today both salaries tally under one `income.section40_1`, and the Levy caps the couple at 100,000.

`sim` needs no new primitive for any of this: a Tally label is already the unit of per-person scope (sim ADR 0009), and a Scenario holds several Levies that share labels and never read each other (sim GLOSSARY, Levy).

## Decision

- **Filer label.** A Filer is named by an id the caller chooses (`[a-z0-9-]{1,32}`). The Filer label of a Tally label for Filer `f` is `<label>@<f>`, for example `income.section40_1@partner`. Shared income uses the reserved Filer id `shared`: `income.section40_4.interest@shared`. `thFilerLabel(label, filer)` is the one exported way to build one, so the CLI never assembles the string itself.
- **`ThLevyProfile.filers`.** This is an optional list of one or two Filer ids.
  - **Absent:** the Levy reads today's bare labels, and its Measures are byte-identical to today's. Every stored Levy keeps its meaning.
  - **One Filer** (`single`, `married_no_income_spouse`, `married_separate`): every income and contribution tally reads that Filer's labels. When the status is `married_separate`, each income tally also reads half of the `@shared` tally for the same label (`scale 1/2`, rounded `floor`), because s.57 sexies para 2 splits unattributed income half each. Flooring loses at most one satang of a period's shared income per label, and it is lost the same way on both Returns. The test pins that loss.
  - **Two Filers** (`married_joint` only): assessable income is the sum of both Filers' tallies plus the whole `@shared` tally. **The s.42 bis and s.42 ter expenses are computed per Filer** and then summed, so each spouse keeps their own 100,000 ceiling. Contribution allowances are capped per Filer against that Filer's own income and then summed, which is the per-spouse reading the research recommends ([note 4](../research/separate-filing.md#q1-who-claims-which-allowance-when-spouses-file-separately)). Every later stage (allowances, brackets, minimum tax, credits) runs once on the sums.
  - Any other list is refused with a `TaxValidationError` and one field per rule: an id that does not match the pattern or is `shared`, a repeated id, two Filers on a status other than `married_joint`, more than two, and `married_joint` with one Filer.
- **`married_separate_40_1_joint_rest` is not given Filers yet.** Its s.40(1) Return holds one Filer's income of one class, and the rest joins the other Return. Expressing that needs a per-class Filer selection, and the research found no source for how its allowances divide. A profile that combines this status with `filers` is refused until an owner ruling says how the allowances divide.
- **Exports.** `TH_LEVY_SHARED_FILER`, `thFilerLabel`, and `thLevyTalliesFor(filers)` (the labels a Levy with these Filers reads), so the CLI can check that every labelled Flow is read by some Levy.

## Considered options

- **A per-Filer label prefix (`me:income.section40_1`).** Rejected. The suffix keeps the existing label first, so a reader grouping by income class sorts naturally, and `TH_LEVY_INCOME_LABELS` still finds the class with a `startsWith`.
- **Two Filers by passing two profiles to the emitter and adding the Levies.** Rejected. A joint Return is one bracket walk over the sum. Two Levies would walk the brackets twice.
- **Splitting shared income in the caller (two Flows at half each).** Rejected as the only way. It works, and a caller may still do it, but it doubles every shared Flow and loses the fact that the income is the couple's.
- **Keeping joint filing on bare labels.** Rejected. It cannot apply s.42 bis para 2 (above).

## Consequences

- The emitter grows by the Filer arithmetic only. The calculator (`calculate.ts`) is unchanged: it already computes one Return from figures, and the corpus checks a separate Return there as two calls.
- A joint two-earner Levy differs from today's joint Levy wherever each salary is above 200,000. That is a fix, and the change log says so.
- The Measure count of a two-Filer Levy roughly doubles in the tally and expense stages. sim's evaluator is linear in Measures, so this costs nothing that matters.
