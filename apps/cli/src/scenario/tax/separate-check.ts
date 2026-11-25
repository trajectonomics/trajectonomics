import {
	TH_2026_PARAMETERS,
	type ThLevyProfile,
	ThSeparateClaimCode,
	type ThSeparateClaimProblem,
	thSeparateClaimProblems,
} from "@trajectonomics/core/tax/th"
import { type AppError, fail } from "../../errors"
import type { ScenarioDocument } from "../document"
import { SHARED } from "../household/model"
import type { FilerScope } from "./filer-scope"
import type { TaxRequest } from "./flags"
import { records } from "./json"

/** The part of one Filer's Return the check across Returns reads; no Filer states nothing. */
function profileOf(request: TaxRequest, filer: string | undefined): ThLevyProfile {
	const claims = filer === undefined ? undefined : request.returns?.[filer]
	return {
		filingStatus: "married_separate",
		allowances: {
			parents: claims?.allowances.parents ?? 0,
			mortgageInterest: claims?.allowances.mortgageInterest ?? 0,
		},
	}
}

/** Whether the household says both people own a loan, which makes it one they borrowed together. */
function sharesLoan(document: ScenarioDocument, scope: FilerScope): boolean {
	return records(document["accounts"]).some(
		(account) =>
			account["kind"] === "liability" &&
			scope.ownerOf.get(`accounts.${String(account["id"])}`) === SHARED,
	)
}

/** One broken rule as the refusal at the flag that states it. */
function refusal(problem: ThSeparateClaimProblem, scope: FilerScope): AppError {
	const persons = problem.returns.map((at) => scope.filers[at] as string)
	const details = { problem: problem.code, persons }
	const names = persons.map((person) => `"${person}"`).join(" and ")
	if (problem.code === ThSeparateClaimCode.OwnParentsOverTwo) {
		const most = TH_2026_PARAMETERS.allowances.parent.maxOwnCount
		return fail("invalid_input", {
			path: "parents",
			message: `--parents: ${names} claims more than ${most} parents, but a separate Return claims only its Filer's own (${problem.code}).`,
			hint: `State each Return's own parents, at most ${most}, as --parents ${persons[0]}=${most}; add --merge to change a stored profile.`,
			details,
		})
	}
	const ceiling = TH_2026_PARAMETERS.allowances.mortgageInterestCeiling
	return fail("invalid_input", {
		path: "mortgageInterest",
		message: `--mortgage-interest: ${names} state more than ${ceiling} THB together, the ceiling for one loan borrowed together (${problem.code}).`,
		hint: "State each Return's share of the interest, such as half each. A liability Account whose Owner is shared is read as a loan borrowed together.",
		details,
	})
}

/**
 * The refusal for what two separate Returns claim between them (tax ADR-0010), or null. tax-core owns
 * the rules; the CLI says only whether the household names a loan both own.
 */
export function separateRefusal(
	request: TaxRequest,
	scope: FilerScope | null,
	document: ScenarioDocument,
): AppError | null {
	if (scope?.kind !== "separate") return null
	const [first, second] = scope.filers
	const sharedMortgage = second !== undefined && sharesLoan(document, scope)
	const [problem] = thSeparateClaimProblems(profileOf(request, first), profileOf(request, second), {
		sharedMortgage,
	})
	return problem === undefined ? null : refusal(problem, scope)
}
