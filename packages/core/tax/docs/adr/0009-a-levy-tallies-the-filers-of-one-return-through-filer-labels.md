# A Levy tallies the Filers of one Return through Filer labels

Status: Accepted. Step 1 is built in trajectonomics/trajectonomics#505 (#343).

## Context

`emitThLevy` models one Return over fixed Tally labels (`levy/labels.ts`, `levy/tallies.ts`). Two Levies emitted from it would both tally every Flow, so a couple who file separately cannot be modelled. Under s.57 sexies each spouse files a Return for their own income, and income that cannot be attributed counts as half each ([research](../research/separate-filing.md#the-rule-s57-sexies-มาตรา-57-ฉ)).

A joint Return is not simply one Filer either. s.42 bis para 2 gives each spouse their own 50% standard expense, capped at 100,000, for s.40(1)–(2) income, even on a joint Return. RD's worked example applies each spouse's own cap on a joint return (RD page 6057). Today both salaries tally under one `income.section40_1`, and the Levy caps the couple at 100,000.

`sim` needs no new primitive for any of this. A Tally label is already the unit of per-person scope (sim ADR 0009). A Scenario holds several Levies that share labels and never read each other (sim GLOSSARY, Levy).

## Decision

- **Filer label.** A Filer is named by an id the caller chooses, matching `[a-z0-9-]{1,32}`. For Filer `f`, the Filer label of a Tally label is `<label>@<f>`, for example `income.section40_1@partner`. Shared income uses the reserved Filer id `shared`: `income.section40_4.interest@shared`. `thFilerLabel(label, filer)` is the one exported way to build one, so the CLI never assembles the string itself.
- **`ThLevyProfile.filers`.** An optional list of one or two Filer ids.
  - **Absent:** the Levy reads today's bare labels, and its Measures are byte-identical to today's. Every stored Levy keeps its meaning.
  - **One Filer** (`single`, `married_no_income_spouse`, `married_separate`, `married_joint`): every income and contribution tally reads that Filer's labels. Under `married_separate` and `married_joint`, each income tally also reads the `@shared` tally for the same label: half of it under `married_separate` (s.57 sexies para 2), and all of it under `married_joint`.
    - The half is `scale 1/2`, rounded `floor`. That loses at most one satang per label in a period, the same on both Returns, and a test pins the loss.
    - A joint Return with one Filer is a partner with no labelled income of their own. It is still a joint Return, so the spouse allowance stays.
  - **Two Filers** (`married_joint` only): assessable income is the sum of both Filers' tallies plus the whole `@shared` tally.
    - **The s.42 bis and s.42 ter expenses are computed per Filer** and then summed, so each spouse keeps their own 100,000 ceiling.
    - The expense on `@shared` s.40(1)–(2) income splits half and half: each half joins one Filer's income before that Filer's ceiling applies. This follows s.57 sexies para 2, which makes unattributed income half each spouse's.
    - Contribution allowances are capped per Filer against that Filer's own income and then summed. This is the per-spouse reading the research recommends ([notes 3–4](../research/separate-filing.md#q1-who-claims-which-allowance-when-spouses-file-separately)).
    - Every later stage (allowances, brackets, minimum tax, credits) runs once on the sums: one bracket walk.
  - **Refusals.** Any other list is refused with a `TaxValidationError`, with one field per rule:
    - an id that does not match the pattern, or is `shared`;
    - a repeated id;
    - two Filers on a status other than `married_joint`;
    - more than two Filers.
- **`married_separate_40_1_joint_rest` is not given Filers yet.** One spouse's s.40(1) Return holds one class of their income, and the rest joins the other Return. RD ruling 0702/1985 (2025) shows that this needs **per-class Filer selection plus income apportionment of the 100,000 cap** between the two Returns, and of the RMF and LTF limits too. A profile that combines this status with `filers` is refused until a later step builds both. Without `filers` the status works as it does today.
- **Exports.** `TH_LEVY_SHARED_FILER`, `thFilerLabel`, `ThLevyFilerField` (one field per refusal), and `thLevyTalliesFor(filers, filingStatus)` (the labels a Levy with these Filers reads, `@shared` included only on a married Return). The CLI uses the last to check that every labelled Flow is read by some Levy.
- **As built.**
  - Refusal fields: `levy.filers.empty`, `.max` (more than two), `.id` (off the pattern), `.shared`, `.duplicate`, `.count` (two Filers on a status other than `married_joint`), `.status` (`married_separate_40_1_joint_rest`).
  - An elected actual expense on s.40(3) is one figure for the Return, so it is computed on the sums; only the standard 50% is per Filer.
  - The odd satang of the shared income goes to the second Filer, so the two halves add up to the whole.
  - The Measures that read a Filer's tally with its share of the shared income (the sums, the halving of `@shared` and the second Filer's remainder) have ids starting `read.`. `thLevyAssumptions` follows them to the tally, and does not count the halving as a standard rate, so it can tell a tally scaled by a standard rate from one that is only capped. It reads a Filer label as its bare label.
  - On `married_separate` each Return reads `floor(shared / 2)`, so an odd satang of `@shared` appears in neither Return.

## Considered options

- **A per-Filer label prefix (`me:income.section40_1`).** Rejected. The suffix keeps the existing label first, so a reader grouping by income class sorts naturally, and a `startsWith` on `TH_LEVY_INCOME_LABELS` still finds the class.
- **Two Filers by passing two profiles to the emitter and adding the Levies.** Rejected. A joint Return is one bracket walk over the sum, and two Levies would walk the brackets twice.
- **Splitting shared income in the caller (two Flows at half each).** Rejected as the only way. It works, and a caller may still do it, but it doubles every shared Flow and loses the fact that the income is the couple's.
- **Keeping joint filing on bare labels.** Rejected. It cannot apply s.42 bis para 2 (above).

## Consequences

- The emitter grows by the Filer arithmetic only. The calculator (`calculate.ts`) is unchanged: it computes one Return from figures. The joint corpus case is a hand computation transcribed into the test, not two calculator calls.
- A two-Filer joint Levy differs from today's bare-label joint Levy whenever both spouses have some s.40(1)–(2) income and the couple's total is above 200,000. For example, 300,000 + 100,000 allows 150,000 of expenses, not 100,000. That is a fix, and the change log says so.
- A two-Filer Levy has roughly twice as many Measures in the tally and expense stages. sim's evaluator is linear in Measures.
