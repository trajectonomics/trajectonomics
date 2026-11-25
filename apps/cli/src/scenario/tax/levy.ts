import { type AppError, fail, isAppError } from "../../errors"
import type { ScenarioDocument } from "../document"
import { leviesFor } from "./emitter"
import { withoutFilerLabels } from "./filer-labels"
import { type FilerScope, filerScopeOf, withFilerLabels } from "./filer-scope"
import type { TaxRequest } from "./flags"
import { flagOf } from "./flags"
import { records } from "./json"
import { labelRefusal } from "./label-refusal"
import { type FlowLabel, withFlowLabels } from "./labels"
import { isTaxLevyId } from "./levy-ids"
import { joinedPrepayments, pointedPrepayments } from "./prepayments"

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
	levies: string[]
	filers?: string[]
}

/** The refusal for per-Return claims with no separate Return to hold them, at the flag that stated one. */
function noFilers(field: string): AppError {
	return fail("invalid_input", {
		path: field,
		message: `${flagOf(field)} names a person, but this plan has no separate Return to put the value on: it needs --filing-status married_separate and a household with a partner and Owners.`,
		hint: 'Add a partner and Owners with "traj scenario household", or state the value bare for the holder.',
	})
}

/** The document with each taxed item labelled for its Owner and each Prepayment pointed at its Levy. */
function decorated(document: ScenarioDocument, scope: FilerScope | null): ScenarioDocument {
	const joined = joinedPrepayments(document)
	const labelled = scope === null ? joined : withFilerLabels(joined, scope)
	return pointedPrepayments(labelled, scope)
}

/** The request without the per-Return claims a plan with no separate Return cannot use. */
function withoutReturns(request: TaxRequest): TaxRequest {
	if (request.returns === undefined && request.persons === undefined) return request
	const { returns: _returns, persons: _persons, ...flat } = request
	return flat
}

/** The request with its per-Return claims kept only for the Filers that got a Levy. */
function returnsOf(request: TaxRequest, scope: FilerScope): TaxRequest {
	if (request.returns === undefined) return request
	const returns = Object.fromEntries(
		Object.entries(request.returns).filter(([person]) => scope.filers.includes(person)),
	)
	return { ...request, returns }
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
	if (request.persons !== undefined && request.persons.length > 0 && scope?.kind !== "separate") {
		return noFilers(request.persons[0] as string)
	}
	const built = leviesFor(request, scope)
	if (isAppError(built)) return built
	const next = decorated(stated, scope)
	const kept = records(next["levies"]).filter((levy) => !isTaxLevyId(levy["id"]))
	return {
		document: { ...next, levies: [...kept, ...built] },
		request: scope?.kind === "separate" ? returnsOf(request, scope) : withoutReturns(request),
		levies: built.map((levy) => levy["id"] as string),
		...(scope === null ? {} : { filers: scope.filers }),
	}
}
