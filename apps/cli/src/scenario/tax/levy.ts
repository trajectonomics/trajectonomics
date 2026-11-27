import { type AppError, isAppError } from "../../errors"
import type { ScenarioDocument } from "../document"
import { holderIdOf } from "./couple"
import { departedClaimants } from "./departed-claims"
import { leviesFor } from "./emitter"
import { withoutFilerLabels } from "./filer-labels"
import { type FilerScope, filerScopeOf, withFilerLabels } from "./filer-scope"
import type { TaxRequest } from "./flags"
import { records } from "./json"
import { keptRequest } from "./kept-returns"
import { labelRefusal } from "./label-refusal"
import { type FlowLabel, withFlowLabels } from "./labels"
import { isTaxLevyId } from "./levy-ids"
import { personRefusal } from "./person-refusals"
import { joinedPrepayments } from "./prepayments-join"
import { pointedPrepayments } from "./prepayments-point"
import { separateRefusal } from "./separate-check"
import { assumesSeparateLoans } from "./separate-loans"
import { unclaimedClaims } from "./unclaimed"

export {
	filerOfTaxLevy,
	isTaxLevyId,
	leviesOf,
	TAX_LEVY_ID,
	taxLeviesOf,
	taxLevyIdFor,
	taxLevyIds,
} from "./levy-ids"

/** What a tax write puts in the document: the Levies and labels, the request it resolved, and the Filers. */
export type TaxLevyWritten = {
	document: ScenarioDocument
	request: TaxRequest
	/** The Levies this build wrote, in document order (cli ADR-0075). */
	levies: string[]
	/** The Filers of the Return the Levies are written for; absent for a plan that keeps bare labels. */
	filers?: string[]
	/** Whether each Return's home-loan interest was taken to be on separate loans. */
	separateLoans: boolean
	/** What the kept profile holds that no Return of this write claims, one sentence each. */
	unclaimed: string[]
}

/** The document with each taxed item labelled for its Owner and each Prepayment pointed at its Levy. */
function decorated(document: ScenarioDocument, scope: FilerScope | null): ScenarioDocument {
	const joined = joinedPrepayments(document)
	const labelled = scope === null ? joined : withFilerLabels(joined, scope)
	return pointedPrepayments(labelled, scope)
}

/**
 * The document with this build's tax Levies written in place of any it already held. Re-applying is
 * how a caller changes the profile, so the old Levies are replaced rather than treated as a conflict.
 * A household with a partner and Owners writes one Levy over both people when it files jointly, and
 * one per person when it files separately; the Flows' labels take their Owner's suffix, and each
 * Prepayment moves to its Flow's Owner's Levy (cli ADR-0075).
 */
export function withTaxLevy(
	document: ScenarioDocument,
	request: TaxRequest,
	labels: readonly FlowLabel[],
	household: string | null = null,
): TaxLevyWritten | AppError {
	const stated = withFlowLabels(withoutFilerLabels(document), labels)
	if (isAppError(stated)) return stated
	const refused = labelRefusal(stated)
	if (refused !== null) return refused
	const scope = filerScopeOf(household, stated, request.filingStatus)
	if (isAppError(scope)) return scope
	const claim = personRefusal(request.named, scope) ?? separateRefusal(request, scope)
	if (claim !== null) return claim
	const built = leviesFor(request, scope)
	if (isAppError(built)) return built
	const next = decorated(stated, scope)
	const others = records(next["levies"]).filter((levy) => !isTaxLevyId(levy["id"]))
	const holder = holderIdOf(household)
	if (isAppError(holder)) return holder
	const kept = keptRequest(request, scope, holder)
	const departed = departedClaimants(kept, household)
	if (isAppError(departed)) return departed
	return {
		document: { ...next, levies: [...others, ...built] },
		request: kept,
		levies: built.map((levy) => levy["id"] as string),
		...(scope === null ? {} : { filers: scope.filers }),
		separateLoans: assumesSeparateLoans(request, scope, stated),
		unclaimed: unclaimedClaims(request, kept, scope, departed, holder),
	}
}
