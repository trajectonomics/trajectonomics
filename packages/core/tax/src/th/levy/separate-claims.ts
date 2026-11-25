import { validateMonetaryAmount } from "../../core/money"
import { TH_2026_PARAMETERS } from "../parameters"
import { ThAllowanceField, type ThParentsInput } from "../types"
import { toSatang } from "../units"
import type { ThLevyProfile } from "./profile-types"

/**
 * The rules `thSeparateClaimProblems` checks, one code each.
 *
 * Purpose: Names the rule a pair of separate Returns broke, so a caller can report it without
 * parsing text.
 * Math: No arithmetic; codes only.
 * Units: Dimensionless codes.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Section 47(1)(ญ), 47(1)(ซ) (tax ADR 0010).
 */
export enum ThSeparateClaimCode {
	/** A separate Return claims more than its Filer's own two parents. */
	OwnParentsOverTwo = "OWN_PARENTS_OVER_TWO",
	/** The two Returns' interest on one co-borrowed loan adds up to more than the ceiling. */
	MortgageOverCeiling = "MORTGAGE_OVER_CEILING",
}

/**
 * One rule a pair of separate Returns broke, with the Returns it names.
 *
 * Purpose: Carries the code and which Returns (0 for the first profile, 1 for the second) it is about.
 * Math: No arithmetic.
 * Units: Return positions.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Section 47 (tax ADR 0010).
 */
export interface ThSeparateClaimProblem {
	readonly code: ThSeparateClaimCode
	readonly returns: readonly (0 | 1)[]
}

/**
 * What the caller states about the pair, because a profile holds an amount, not a loan.
 *
 * Purpose: Lets the caller say that both Returns' mortgage interest is one co-borrowed loan.
 * Math: No arithmetic.
 * Units: Not monetary.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Section 47(1)(ซ).
 */
export interface ThSeparateClaimOptions {
	/** Both Returns state interest on the same co-borrowed loan. */
	readonly sharedMortgage?: boolean | undefined
}

function namedParents(parents: ThParentsInput | number | undefined): number {
	if (parents === undefined) return 0
	if (typeof parents === "number") {
		validateMonetaryAmount(parents, ThAllowanceField.Parents)
		return Math.floor(parents)
	}
	const slots = [
		parents.taxpayerFather,
		parents.taxpayerMother,
		parents.spouseFather,
		parents.spouseMother,
	]
	return slots.filter(Boolean).length
}

/**
 * Checks what two separate Returns state against the rules a count can show.
 *
 * Purpose: The cross-Return check that one Levy cannot make (tax ADR 0010). Two rules are not here
 * because a count cannot show them: one parent on one Return only (N-136 clause 1(3)) and one
 * caregiver per disabled person (N-193 clause 1); the caller states those claims correctly. The
 * caller passes `married_separate` profiles; the status is not re-checked.
 * Math: A Return's named parents (every slot named, or the count) above `parent.maxOwnCount` is
 * `OWN_PARENTS_OVER_TWO` for that Return. With `sharedMortgage`, the two Returns' interest in
 * satang, added as BigInt, above the mortgage ceiling is `MORTGAGE_OVER_CEILING` for both.
 * Units: THB major units for interest, counts for parents; satang inside.
 * Throws: TaxValidationError if a stated count or interest is not valid.
 *
 * @param first One separate Return's profile.
 * @param second The other separate Return's profile.
 * @param options What the caller states about the pair.
 * @returns Each broken rule, own-parents problems first; empty when none.
 * @statute Thailand Revenue Code Section 47(1)(ญ), 47(1)(ซ).
 */
export function thSeparateClaimProblems(
	first: ThLevyProfile,
	second: ThLevyProfile,
	options: ThSeparateClaimOptions = {},
): readonly ThSeparateClaimProblem[] {
	const p = TH_2026_PARAMETERS.allowances
	const over = (profile: ThLevyProfile): boolean =>
		namedParents(profile.allowances?.parents) > p.parent.maxOwnCount
	const problems: ThSeparateClaimProblem[] = []
	if (over(first)) problems.push({ code: ThSeparateClaimCode.OwnParentsOverTwo, returns: [0] })
	if (over(second)) problems.push({ code: ThSeparateClaimCode.OwnParentsOverTwo, returns: [1] })
	const field = ThAllowanceField.MortgageInterest
	const interest = [first, second].map((profile) => profile.allowances?.mortgageInterest ?? 0)
	for (const amount of interest) validateMonetaryAmount(amount, field)
	const total = interest.reduce((sum, amount) => sum + BigInt(toSatang(amount, field)), 0n)
	if (options.sharedMortgage && total > BigInt(toSatang(p.mortgageInterestCeiling))) {
		problems.push({ code: ThSeparateClaimCode.MortgageOverCeiling, returns: [0, 1] })
	}
	return problems
}
