# An allowance is stated as what one Return claims, and the emitter divides nothing

Status: Accepted. Step 2 is built in trajectonomics/trajectonomics#506 (#343).

## Context

When spouses file separately, some allowances stay whole on each Return, some go to one spouse, and some are averaged ([research, Q1](../research/separate-filing.md#q1-who-claims-which-allowance-when-spouses-file-separately)):

- **Whole on each Return:** the personal allowance, and the child allowance. Each parent with income claims 30,000 per child (s.47(1)(ค)(1); RD FAQ). The only halving rule was the repealed s.57 quinque.
- **One spouse claims:**
  - parents: each spouse claims their own, and one parent goes on one Return only;
  - a disabled dependant: the caregiver named on the card claims;
  - pregnancy costs: the wife claims.
- **Averaged:**
  - mortgage interest, by the number of co-borrowers, within 100,000 together;
  - parent health insurance, by the children who pay the policy.

One Levy sees one Return. It cannot know what the other spouse's Levy claims, so it cannot enforce a split between the two.

## Decision

- **A `ThLevyProfile` states the allowances its own Return claims, as amounts and counts.**
  - The emitter applies each allowance's statutory cap and eligibility to that Return alone, as it does today.
  - A split is never a ratio or a "share" field. For example, a co-borrowed loan's interest is stated on each Return as that Return's averaged amount.
- **Eligibility follows the filing status, as today, with one fix and one new refusal.**
  - `married_separate` claims no spouse allowance. This is unchanged.
  - **Fix:** `married_joint` may claim both spouses' parents (`parents.spouseFather`, `parents.spouseMother`). Today only `married_no_income_spouse` may (`stages/allowances-family.ts:62`). The fix rests on s.47(1)(ญ), which names the spouse's parents ([note 2](../research/separate-filing.md#q1-who-claims-which-allowance-when-spouses-file-separately)).
    - It affects only the object form of `parents`. The count form names no slots, and the CLI writes only the count form (`--parents <n>`), so no Levy the CLI writes changes.
  - **New refusal:** `married_separate` claims only the Filer's own parents. Today `computeParentCount` silently ignores spouse slots on this status (`allowances-family.ts:62`). From now on they are refused with a `TaxValidationError` at `allowances.parents`.
- **The check across two Returns is a pure function, not the emitter's job.**
  - It works over what a profile states, which is counts: `thSeparateClaimProblems(a, b, { sharedMortgage })` takes the two separate profiles and returns one problem per rule, each with its own code:
    - `OWN_PARENTS_OVER_TWO`: a separate Return claims more than its own two parents. Together the two Returns can then claim at most four.
    - `MORTGAGE_OVER_CEILING`: with `sharedMortgage`, the interest on both Returns adds up to more than 100,000. The caller says whether the two Returns state one co-borrowed loan, because a profile states an amount, not a loan.
  - Two rules **cannot** be checked from counts, and the caller states them correctly:
    - one parent on one Return only (N-136 clause 1(3)), since a count does not say which parent;
    - one caregiver per disabled person (N-193 clause 1), since a count does not say which person.
  - The CLI calls the function before writing two Levies. The emitter stays one Return in, one Levy out.
- **The child allowance needs nothing new.** Each separate profile states the children it claims. This rests on s.47(1)(ค)(1) read with RD's FAQ, which is about 90% sure and not yet confirmed by RD ([note 1](../research/separate-filing.md#q1-who-claims-which-allowance-when-spouses-file-separately)). The CLI's default is 0, as for any unstated allowance (cli ADR 0075), so the contract does not depend on the answer.

## Considered options

- **A household profile with split ratios that the emitter divides.** Rejected. The emitter would need both Returns at once, the ratios have no statutory meaning for most allowances (a parent is claimed whole or not at all), and it would bring the CLI's people into the tax core's contract.
- **Halving the child allowance on a separate Return.** Rejected. That was the repealed s.57 quinque para 2(2).
- **A per-slot parent form in the cross-Return check.** Deferred. The CLI stores parents as a count today. A stored per-slot form, and caregivers named on the household's dependents, are a later step if the check is wanted.
- **Leaving the cross-Return check to the CLI.** Rejected. The rules are statutory, so they belong where the statute is cited and tested.

## Consequences

- The CLI keeps one stored profile per Return (cli ADR 0075). Nothing in the tax core knows about a household.
- Both eligibility changes are listed under As built. Neither changes a Levy the CLI writes today.

## As built

Both behaviour changes are listed here, because the package has no change log. Neither changes a Levy the CLI writes today.

- **`married_joint` claims the spouse's parents (a fix).** In the object form of `parents`, `spouseFather` and `spouseMother` now count on `married_joint` as they do on `married_no_income_spouse`. An object-form profile on a joint Return that names a spouse slot now claims 30,000 more per slot than it did, in the calculator and in the Levy. The count form (`parents: 2`) and every Levy in the golden set (count form) are unchanged. `single` and `married_separate_40_1_joint_rest` still ignore spouse slots, as before.
- **`married_separate` refuses spouse parent slots (new).** A spouse slot set on a separate Return throws a `TaxValidationError` with field `allowance.parents.spouse` (`ThAllowanceField.ParentsSpouseSlot`), from both `calculateThTax` and `emitThLevy`. The Decision above gave the field as `allowances.parents`; the as-built field is the one new enum member, so it stays distinct from `allowance.parents`, which the count validation reports. Before, the slot was dropped without a word.
- **`thSeparateClaimProblems(first, second, { sharedMortgage })`** returns `readonly ThSeparateClaimProblem[]`, each `{ code, returns }`, where `returns` lists the positions (0 for `first`, 1 for `second`) the problem names. One `OWN_PARENTS_OVER_TWO` is returned per Return that is over: its count form, or the number of slots it names, spouse slots included, above `parent.maxOwnCount` (2, a new parameter). `MORTGAGE_OVER_CEILING` names both Returns and needs `sharedMortgage`; the interest is added in satang as BigInt, so exactly 100,000 passes and one satang more does not. It does not check that the profiles are `married_separate`.
- **Corpus.** `corpus-separate-filing.test.ts` holds a separate-filing case where each spouse claims the same two children in full (30,000 each per child, s.47(1)(ค)(1)), worked by hand in the test. The cross-check against a recognised filing calculator is pending and covered by its own issue, so the open point in [note 1](../research/separate-filing.md#q1-who-claims-which-allowance-when-spouses-file-separately) stands.
- **A guard for ADR 0009's as-built `read.` rule.** `levy-filers-assumptions.test.ts` asserts that every standard-rate `scale` that is not itself a `read.` Measure and reads one rate label alone points at a `tally` or a `read.` Measure, for each golden profile and a two-Filer joint profile, so `scaledIds` cannot lose a rate silently.
