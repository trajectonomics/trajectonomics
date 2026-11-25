import { emitThLevy } from "@trajectonomics/core/tax/th"
import { type AppError, fail, isAppError } from "../../errors"
import type { ScenarioDocument } from "../document"
import { withoutFilerLabels } from "./filer-labels"
import { filerScopeOf, withFilerLabels } from "./filer-scope"
import type { TaxRequest } from "./flags"
import { type JsonRecord, records } from "./json"
import { labelRefusal } from "./label-refusal"
import { type FlowLabel, withFlowLabels } from "./labels"

/** The Levy id the CLI writes, and the one whose jurisdictions its notes may name. */
export const TAX_LEVY_ID: string = "th-2026-pit"

/** The Levies a document declares, as JSON records, in document order. */
export function leviesOf(document: ScenarioDocument): JsonRecord[] {
	return records(document["levies"])
}

/**
 * The Levy this build would write for a request, over the Filers of a joint Return when it has
 * them; `AppError` when tax-core refuses the profile.
 */
function levyOf(request: TaxRequest, filers?: readonly string[]): JsonRecord | AppError {
	if (request.jurisdiction !== "th-2026") {
		return fail("invalid_input", {
			message: `--tax ${request.jurisdiction} is not a jurisdiction this build applies.`,
			path: "tax",
		})
	}
	try {
		const levy = emitThLevy({
			filingStatus: request.filingStatus,
			allowances: {
				children: {
					totalCount: request.children,
					secondPlusBorn2018OrLaterCount: request.childrenAtHigherRate,
				},
				parents: request.allowances.parents,
				disabledCareCount: request.allowances.disabledCare,
				socialSecurity: request.allowances.socialSecurity,
				lifeInsurance: request.allowances.lifeInsurance,
				healthInsurance: request.allowances.healthInsurance,
				parentHealthInsurance: request.allowances.parentHealthInsurance,
				spouseLifeInsurance: request.allowances.spouseLifeInsurance,
				mortgageInterest: request.allowances.mortgageInterest,
				donation2x: request.allowances.donation2x,
				donation1x: request.allowances.donation1x,
			},
			levy: { id: TAX_LEVY_ID },
			...(filers === undefined ? {} : { filers }),
		})
		return levy as unknown as JsonRecord
	} catch (error) {
		return fail("invalid_input", {
			message: error instanceof Error ? error.message : "--tax could not build this profile.",
			path: "tax",
		})
	}
}

/** What a tax write puts in the document: the Levy and labels, and the Filers when it has any. */
export type TaxLevyWritten = { document: ScenarioDocument; filers?: string[] }

/**
 * The document with this build's tax Levy written in place of any it already held. Re-applying is
 * how a caller changes the profile, so the old Levy is replaced rather than treated as a conflict.
 * A household with a partner and Owners makes a joint Return one Levy over two Filers, and the
 * Flows' labels take their Owner's Filer suffix (cli ADR-0075).
 */
export function withTaxLevy(
	document: ScenarioDocument,
	request: TaxRequest,
	labels: readonly FlowLabel[],
	household: string | null = null,
): TaxLevyWritten | AppError {
	const bareLevy = levyOf(request)
	if (isAppError(bareLevy)) return bareLevy
	const stated = withFlowLabels(withoutFilerLabels(document), labels)
	if (isAppError(stated)) return stated
	const refused = labelRefusal(stated)
	if (refused !== null) return refused
	const scope = filerScopeOf(household, stated, request.filingStatus)
	if (isAppError(scope)) return scope
	const levy = scope === null ? bareLevy : levyOf(request, scope.filers)
	if (isAppError(levy)) return levy
	const labelled = scope === null ? stated : withFilerLabels(stated, scope)
	const kept = leviesOf(labelled).filter((it) => it["id"] !== TAX_LEVY_ID)
	return {
		document: { ...labelled, levies: [...kept, levy] },
		...(scope === null ? {} : { filers: scope.filers }),
	}
}
