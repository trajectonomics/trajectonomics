import {
	TH_2026_PARAMETERS,
	type ThLevyProfile,
	type ThSeparateClaimProblem,
	thSeparateClaimProblems,
} from "@trajectonomics/core/tax/th"
import { type AppError, fail } from "../../errors"
import type { FilerScope } from "./filer-scope"
import type { TaxRequest } from "./flags"

/** The part of one Filer's Return the check across Returns reads; no Filer states nothing. */
function profileOf(request: TaxRequest, filer: string | undefined): ThLevyProfile {
	const claims = filer === undefined ? undefined : request.returns?.[filer]
	return {
		filingStatus: "married_separate",
		allowances: { parents: claims?.allowances.parents ?? 0 },
	}
}

/** A Return claiming more than its own parents, as the refusal at `--parents`. */
function refusal(problem: ThSeparateClaimProblem, scope: FilerScope): AppError {
	const persons = problem.returns.map((at) => scope.filers[at] as string)
	const names = persons.map((person) => `"${person}"`).join(" and ")
	const most = TH_2026_PARAMETERS.allowances.parent.maxOwnCount
	return fail("invalid_input", {
		path: "parents",
		message: `--parents: ${names} claims more than ${most} parents, but a separate Return claims only its Filer's own (${problem.code}).`,
		hint: `State each Return's own parents, at most ${most}, as --parents ${persons[0]}=${most}; add --merge to change a stored profile.`,
		details: { problem: problem.code, persons },
	})
}

/**
 * The refusal for what two separate Returns claim between them (tax ADR-0010), or null. tax-core owns
 * the rules. Its shared home-loan ceiling is not asked for, because the plan cannot say which loan a
 * Return's interest is on (`separate-loans.ts`).
 */
export function separateRefusal(request: TaxRequest, scope: FilerScope | null): AppError | null {
	if (scope?.kind !== "separate") return null
	const [first, second] = scope.filers
	const [problem] = thSeparateClaimProblems(profileOf(request, first), profileOf(request, second))
	return problem === undefined ? null : refusal(problem, scope)
}
