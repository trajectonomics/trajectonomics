import { fromMinorUnits } from "@trajectonomics/core/money"
import {
	TH_2026_PARAMETERS,
	type ThLevyProfile,
	ThSeparateClaimCode,
	type ThSeparateClaimProblem,
	thSeparateClaimProblems,
} from "@trajectonomics/core/tax/th"
import { type AppError, fail } from "../../errors"
import { withinCore } from "./claims-bound"
import { outOfRange } from "./claims-values"
import type { FilerScope } from "./filer-scope"
import type { TaxRequest } from "./flags"
import { sharedShares } from "./shared-mortgage"

/**
 * The part of one Filer's Return the check across Returns reads: its parents, and its share in satang
 * of the loan borrowed together, not its own other interest. No Filer states nothing.
 */
function profileOf(request: TaxRequest, filer: string | undefined, share = 0): ThLevyProfile {
	const claims = filer === undefined ? undefined : request.returns?.[filer]
	return {
		filingStatus: "married_separate",
		allowances: {
			parents: claims?.allowances.parents ?? 0,
			mortgageInterest: fromMinorUnits(share, 2),
		},
	}
}

/** The flag, the sentence and the correction for each rule two separate Returns can break. */
function wording(code: ThSeparateClaimCode, persons: readonly string[]) {
	const { parent, mortgageInterestCeiling: ceiling } = TH_2026_PARAMETERS.allowances
	if (code === ThSeparateClaimCode.MortgageOverCeiling) {
		const most = ceiling.toLocaleString("en-US")
		return {
			path: "mortgageInterest",
			message: `--mortgage-interest: "shared=" states more than ${most} baht, the one ceiling a loan borrowed together has for both Returns`,
			hint: `State at most ${most} baht, as --mortgage-interest shared=${ceiling}; add --merge to change a stored profile.`,
		}
	}
	const names = persons.map((person) => `"${person}"`).join(" and ")
	const most = parent.maxOwnCount
	return {
		path: "parents",
		message: `--parents: ${names} claims more than ${most} parents, but a separate Return claims only its Filer's own`,
		hint: `State each Return's own parents, at most ${most}, as --parents ${persons[0]}=${most}; add --merge to change a stored profile.`,
	}
}

/** One rule two separate Returns broke, as the refusal at the flag that states it. */
function refusal(problem: ThSeparateClaimProblem, scope: FilerScope): AppError {
	const persons = problem.returns.flatMap((at) => scope.filers[at] ?? [])
	const { path, message, hint } = wording(problem.code, persons)
	return fail("invalid_input", {
		path,
		message: `${message} (${problem.code}).`,
		hint,
		details: { problem: problem.code, persons },
	})
}

/**
 * The refusal for what two separate Returns claim between them (tax ADR-0010), or null. tax-core owns
 * the rules. Its shared home-loan ceiling is asked for only of the interest stated as shared, because
 * the plan cannot say which loan a Return's own interest is on (`separate-loans.ts`).
 */
export function separateRefusal(request: TaxRequest, scope: FilerScope | null): AppError | null {
	if (scope?.kind !== "separate") return null
	const together = request.sharedMortgageInterest ?? 0
	if (!withinCore("mortgageInterest", together)) return outOfRange("mortgageInterest")
	const [first, second] = scope.filers
	const [mine, theirs] = sharedShares(request, scope.filers.length)
	const [problem] = thSeparateClaimProblems(
		profileOf(request, first, mine),
		profileOf(request, second, theirs),
		{ sharedMortgage: request.sharedMortgageInterest !== undefined },
	)
	return problem === undefined ? null : refusal(problem, scope)
}
