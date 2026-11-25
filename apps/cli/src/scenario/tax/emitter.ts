import { emitThLevy } from "@trajectonomics/core/tax/th"
import { type AppError, fail, isAppError } from "../../errors"
import { allowancesOf } from "./allowances"
import type { FilerScope } from "./filer-scope"
import type { TaxRequest } from "./flags"
import type { JsonRecord } from "./json"
import { TAX_LEVY_ID, taxLevyIdFor } from "./levy-ids"

/** The Levy this build would write for a request and a Levy id; `AppError` when tax-core refuses it. */
export function emitLevy(
	request: TaxRequest,
	id: string,
	filers?: readonly string[],
): JsonRecord | AppError {
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
			levy: { id },
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

/** One Filer's Return of a separate filing: that Filer's claim set, or one that states nothing. */
function requestForFiler(request: TaxRequest, filer: string): TaxRequest {
	const claims = request.returns?.[filer]
	return {
		jurisdiction: request.jurisdiction,
		filingStatus: "married_separate",
		children: claims?.children ?? 0,
		childrenAtHigherRate: claims?.childrenAtHigherRate ?? 0,
		allowances: claims?.allowances ?? allowancesOf({}),
	}
}

/** One Levy, as the list a write returns. */
function one(levy: JsonRecord | AppError): JsonRecord[] | AppError {
	return isAppError(levy) ? levy : [levy]
}

/** One Levy per Filer of a separate Return, keyed by that Filer's Levy id. */
function separateLevies(request: TaxRequest, scope: FilerScope): JsonRecord[] | AppError {
	const levies: JsonRecord[] = []
	for (const filer of scope.filers) {
		const levy = emitLevy(requestForFiler(request, filer), taxLevyIdFor(filer), [filer])
		if (isAppError(levy)) return levy
		levies.push(levy)
	}
	return levies
}

/** The Levies a request writes: one for a bare or joint Return, one per Filer for a separate one. */
export function leviesFor(
	request: TaxRequest,
	scope: FilerScope | null | AppError,
): JsonRecord[] | AppError {
	if (isAppError(scope)) return scope
	if (scope === null) return one(emitLevy(request, TAX_LEVY_ID))
	if (scope.kind === "joint") return one(emitLevy(request, TAX_LEVY_ID, scope.filers))
	return separateLevies(request, scope)
}
