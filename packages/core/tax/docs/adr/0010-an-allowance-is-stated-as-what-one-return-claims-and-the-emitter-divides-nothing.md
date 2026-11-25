# An allowance is stated as what one Return claims, and the emitter divides nothing

Status: Proposed (trajectonomics/trajectonomics#343).

## Context

When spouses file separately, some allowances stay whole on each Return, some go to one spouse, and some are averaged ([research, Q1](../research/separate-filing.md#q1-who-claims-which-allowance-when-spouses-file-separately)):

- **Whole on each Return:** the child allowance (each parent with income claims 30,000 a child, per RD's FAQ), and the personal allowance.
- **One spouse claims:** parents (each spouse their own, and one parent on one Return only), a disabled dependant (the caregiver named on the card), and pregnancy costs (the wife).
- **Averaged:** mortgage interest (by the number of co-borrowers, within 100,000 together), and parent health insurance (by the children who pay the policy).

One Levy sees one Return. It cannot know what the other spouse's Levy claims, so it cannot enforce a split between the two.

## Decision

- **A `ThLevyProfile` states the allowances its Return claims, as amounts and counts for that Return.** The emitter applies each allowance's statutory cap and eligibility to that Return alone, as it does today. A split is never a ratio or a "share" field. For example, a co-borrowed loan's interest is stated on each Return as that Return's averaged amount.
- **Eligibility follows the filing status, as today, with one correction and one new refusal:**
  - `married_separate` claims no spouse allowance (unchanged).
  - `married_joint` may claim both spouses' parents (`parents.spouseFather`, `parents.spouseMother`). Today only `married_no_income_spouse` may (`stages/allowances-family.ts:62`), against N-136 clause 1(6)(ข) read across to s.57 sexies.
  - `married_separate` claims only the Filer's own parents (unchanged), so a spouse's parents stated on a separate profile are refused, not silently dropped.
- **The check across Returns is a pure function, not the emitter's.** `thSeparateClaimProblems(a, b, { sharedMortgage })` takes the two separate profiles and returns one problem per rule, each with its own code:
  - `PARENT_CLAIMED_TWICE`: the same parent slot on both Returns (N-136 clause 1(3)).
  - `MORTGAGE_OVER_CEILING`: with `sharedMortgage`, the interest on both Returns adds up to more than 100,000. The caller says whether the two Returns state one co-borrowed loan, because a profile states an amount, not a loan.
  A disabled dependant is claimed by one caregiver (N-193 clause 1), but a profile states only a count, so it cannot see that two Returns claim the same person. The CLI checks that from the household's dependents (cli ADR 0076). The CLI calls `thSeparateClaimProblems` before writing two Levies. The emitter stays one Return in, one Levy out.
- **The child allowance needs nothing new.** Each separate profile states the children it claims, normally all of them. This rests on RD's FAQ, not on statute text ([note 1](../research/separate-filing.md#q1-who-claims-which-allowance-when-spouses-file-separately)). If an owner ruling or an RD answer says otherwise, only the CLI's default changes, not this contract.

## Considered options

- **A household profile with split ratios that the emitter divides.** Rejected. The emitter would need both Returns at once, the ratios have no statutory meaning for most allowances (a parent is claimed whole or not at all), and it would bring the CLI's people into the tax core's contract.
- **Halving the child allowance on a separate Return.** Rejected. That was the repealed s.57 quinque. Under current law each Return claims in full.
- **Leaving the cross-Return check to the CLI.** Rejected. The rules are statutory (N-136 and the 100,000 ceiling), so they belong where the statute is cited and tested.

## Consequences

- The CLI keeps one stored profile per Return (cli ADR 0075). Nothing in the tax core knows about a household.
- The `married_joint` parent correction changes the Levy of a joint plan that states a spouse's parents. Today those parents are dropped without a word. The change log says so.
